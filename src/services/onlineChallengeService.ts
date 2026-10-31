/**
 * Online Challenge Client Service
 * 
 * Supports both Live WebSocket Relay and Direct Firebase Firestore Realtime Sync.
 * Automatically detects Android native platforms (Capacitor/WebView) and cloud environments
 * to ensure 100% uninterrupted connectivity for live PvP challenges.
 */

import { db } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
  runTransaction,
  collection,
  query,
  where,
  getDocs,
  increment,
} from 'firebase/firestore';

export interface ChallengeParticipant {
  playerId: string;
  playerName: string;
  avatar?: string;
  clubName: string;
  clubLogo?: string;
  primaryColor?: string;
  clubRating: number;
  tactics: any;
  squadSummary?: { id: string; name: string; position: string; rating: number }[];
  benchSummary?: { id: string; name: string; position: string; rating: number }[];
  isReady?: boolean;
  isConnected?: boolean;
}

export interface ChallengeRoomState {
  code: string;
  status: 'waiting' | 'ready' | 'playing' | 'completed' | 'closed';
  createdAt: number;
  host: ChallengeParticipant;
  guest?: ChallengeParticipant;
  matchState?: any;
}

export interface ChallengeHistoryItem {
  id: string;
  roomCode: string;
  timestamp: number;
  opponentName: string;
  opponentClub: string;
  myClub: string;
  myScore: number;
  opponentScore: number;
  result: 'win' | 'draw' | 'loss';
  eventsCount: number;
}

export interface DailyCoachRankEntry {
  rank: number;
  playerId: string;
  coachName: string;
  avatar?: string;
  clubName: string;
  clubRating: number;
  wins: number;
  losses: number;
  draws: number;
  matchesPlayed: number;
  lastActiveTimestamp: number;
  points?: number;
  goalDifference?: number;
}

/** Rooms older than this (no activity) are treated as dead. */
const ROOM_STALE_MS = 3 * 60 * 60 * 1000;
const QUEUE_HEARTBEAT_MS = 2500;
const QUEUE_ENTRY_FRESH_MS = 9000;
const MATCHMAKING_TIMEOUT_MS = 18000;
const todayKey = () => new Date().toISOString().slice(0, 10);

const STORAGE_KEY_CHALLENGE_HISTORY = 'anta_elmodareb_online_challenges_history_v1';
const STORAGE_KEY_PLAYER_ID = 'anta_elmodareb_challenge_player_id';

export function getOrCreatePlayerId(): string {
  let id = localStorage.getItem(STORAGE_KEY_PLAYER_ID);
  if (!id) {
    id = 'p_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem(STORAGE_KEY_PLAYER_ID, id);
  }
  return id;
}

export function isAndroidOrNative(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();
  if (
    ua.includes('android') ||
    ua.includes('wv') ||
    (window as any).Capacitor?.isNativePlatform?.() ||
    (window as any).Capacitor?.getPlatform?.() === 'android' ||
    (window as any).Android !== undefined ||
    (window as any).ReactNativeWebView !== undefined
  ) {
    return true;
  }
  if (window.location.protocol === 'file:' || window.location.protocol === 'capacitor:') return true;
  return false;
}

const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        clean[key] = cleanForFirestore(value);
      }
    }
    return clean as T;
  }
  return data;
}

export function getWebSocketServerUrl(): string | null {
  if (typeof window === 'undefined') return null;
  if (window.location.protocol === 'file:' || window.location.protocol === 'capacitor:') {
    return null;
  }

  // If explicitly configured in VITE_WS_URL
  if (typeof import.meta.env.VITE_WS_URL === 'string' && import.meta.env.VITE_WS_URL.trim() !== '') {
    const envUrl = import.meta.env.VITE_WS_URL.trim();
    if (window.location?.hostname) {
      const isDevHost = window.location.hostname.includes('ais-dev-');
      const isEnvPreHost = envUrl.includes('ais-pre-');
      if (isDevHost && isEnvPreHost) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}/ws/challenge`;
      }
    }
    return envUrl;
  }

  if (window.location?.host) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/challenge`;
  }

  return null;
}

type MessageListener = (data: any) => void;
type StatusListener = (status: 'disconnected' | 'connecting' | 'connected') => void;

class OnlineChallengeClient {
  private socket: WebSocket | null = null;
  private messageListeners: Set<MessageListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimer: any = null;
  private currentRoomCode: string | null = null;
  private isIntentionalClose = false;

  // Realtime Firestore state
  private transport: 'websocket' | 'firestore' = 'firestore';
  private firestoreUnsubscribe: Unsubscribe | null = null;
  private cachedRoomState: any = null;
  private lastProcessedEventTime = 0;
  private lastProcessedEventId = '';
  private sawFirstSnapshot = false;
  private lastTickMinute = -1;

  // Firestore matchmaking state
  private queueTimer: any = null;
  private queueTimeout: any = null;
  private queueUnsub: Unsubscribe | null = null;
  private queueActive = false;

  public getStatus(): 'disconnected' | 'connecting' | 'connected' {
    return this.connectionStatus;
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.connectionStatus);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public subscribeMessages(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  private notifyStatus(status: 'disconnected' | 'connecting' | 'connected') {
    this.connectionStatus = status;
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.warn('[OnlineChallenge] Status listener error:', err);
      }
    });
  }

  private emitMessage(data: any) {
    this.messageListeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.warn('[OnlineChallenge] Message listener error:', err);
      }
    });
  }

  public async connect(): Promise<any> {
    if (this.connectionStatus === 'connected') {
      return Promise.resolve();
    }

    this.isIntentionalClose = false;
    this.notifyStatus('connecting');

    // On Android / Native platform, connect directly to Firestore Realtime Relay
    if (isAndroidOrNative()) {
      this.transport = 'firestore';
      this.notifyStatus('connected');
      console.log('[OnlineChallenge] Android/Native Mode: Connected via Firestore Realtime Relay');
      return Promise.resolve();
    }

    // Try WebSocket if a valid URL exists on web
    const wsUrl = getWebSocketServerUrl();
    if (wsUrl) {
      try {
        await this.connectWebSocket(wsUrl);
        return;
      } catch (err) {
        console.log('[OnlineChallenge] WebSocket unavailable, falling back to Firestore Realtime Relay');
      }
    }

    // Default to Firestore Realtime Relay (100% availability)
    this.transport = 'firestore';
    this.notifyStatus('connected');
    console.log('[OnlineChallenge] Connected via Firestore Realtime Relay');
    return Promise.resolve();
  }

  private connectWebSocket(url: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      let timeoutId: any = null;
      let settled = false;

      try {
        const ws = new WebSocket(url);

        timeoutId = setTimeout(() => {
          if (!settled) {
            settled = true;
            try { ws.close(); } catch {}
            reject(new Error('WebSocket timeout'));
          }
        }, 2000);

        ws.onopen = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          this.socket = ws;
          this.transport = 'websocket';
          this.reconnectAttempts = 0;
          this.notifyStatus('connected');
          console.log('[OnlineChallenge] Connected via Live WebSocket Relay');

          if (this.currentRoomCode) {
            this.sendWs({
              type: 'reconnect',
              code: this.currentRoomCode,
              playerId: getOrCreatePlayerId(),
            });
          }

          resolve(ws);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.emitMessage(data);
          } catch (err) {
            console.warn('[WS Challenge] Invalid JSON received:', err);
          }
        };

        ws.onerror = (err) => {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            reject(err);
          }
        };

        ws.onclose = () => {
          this.socket = null;
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            reject(new Error('WebSocket closed'));
          } else {
            // Fallback seamlessly to Firestore if socket drops
            console.log('[WS Challenge] Socket closed, switching seamlessly to Firestore transport');
            this.transport = 'firestore';
            this.notifyStatus('connected');
            if (this.currentRoomCode) {
              this.subscribeFirestoreRoom(this.currentRoomCode);
            }
          }
        };
      } catch (err) {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          reject(err);
        }
      }
    });
  }

  public disconnect() {
    this.isIntentionalClose = true;
    clearTimeout(this.reconnectTimer);
    if (this.socket) {
      try { this.socket.close(); } catch {}
      this.socket = null;
    }
    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
      this.firestoreUnsubscribe = null;
    }
    this.currentRoomCode = null;
    this.cachedRoomState = null;
    this.notifyStatus('disconnected');
  }

  // ==========================================
  // FIRESTORE REALTIME ENGINE
  // ==========================================

  private subscribeFirestoreRoom(code: string) {
    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
      this.firestoreUnsubscribe = null;
    }

    const docRef = doc(db, 'challenge_rooms', code);
    this.sawFirstSnapshot = false;
    this.lastProcessedEventId = '';
    this.firestoreUnsubscribe = onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) {
        if (this.currentRoomCode === code) {
          this.emitMessage({
            type: 'opponent_left',
            message: 'تم إغلاق غرفة التحدي من قبل المنشئ.',
          });
          this.currentRoomCode = null;
          this.cachedRoomState = null;
        }
        return;
      }

      const data = snapshot.data() as any;
      const prev = this.cachedRoomState;
      this.cachedRoomState = data;
      const myPlayerId = getOrCreatePlayerId();
      const isHost = data.host?.playerId === myPlayerId;

      // The host closed the room (we soft-close before deleting so the guest is always told)
      if (data.status === 'closed') {
        if (this.currentRoomCode === code) {
          this.emitMessage({ type: 'opponent_left', message: 'تم إغلاق غرفة التحدي من قبل المنشئ.' });
          this.currentRoomCode = null;
          this.cachedRoomState = null;
        }
        return;
      }

      // 1. Guest joined detection
      if (data.guest && (!prev || !prev.guest)) {
        this.emitMessage({
          type: 'opponent_joined',
          guest: data.guest,
          room: data,
        });
      }

      // 2. Ready status change detection
      if (prev && (
        (data.guest?.isReady !== prev.guest?.isReady) ||
        (data.host?.isReady !== prev.host?.isReady)
      )) {
        const oppReady = isHost ? !!data.guest?.isReady : !!data.host?.isReady;
        this.emitMessage({
          type: 'opponent_ready_changed',
          isReady: oppReady,
          room: data,
        });
      }

      // 3. Match Started status change
      if (data.status === 'playing' && prev?.status !== 'playing') {
        this.emitMessage({
          type: 'match_started',
          initialMatchState: data.matchState,
          room: data,
        });
      }

      // 4. Handle incoming lastEvent updates (ticks, tactics, rematch)
      // Events are de-duplicated by identity, not by the sender's clock: two phones rarely agree on
      // the time, and comparing timestamps made one side silently drop the other side's events.
      const ev = data.lastEvent;
      const evId = ev ? (ev.eventId || `${ev.type}:${ev.senderId}:${ev.timestamp}`) : '';
      const firstSnapshot = !this.sawFirstSnapshot;
      this.sawFirstSnapshot = true;
      if (ev && firstSnapshot) {
        // Joining / reconnecting: whatever is already there happened before us, don't replay it.
        this.lastProcessedEventId = evId;
      } else if (ev && evId !== this.lastProcessedEventId) {
        this.lastProcessedEventId = evId;
        this.lastProcessedEventTime = ev.timestamp || this.lastProcessedEventTime;
        const { type, senderId, ...rest } = ev;

        if (senderId !== myPlayerId) {
          if (type === 'opponent_in_game_tactics' || type === 'in_game_tactics') {
            this.emitMessage({
              type: 'opponent_in_game_tactics',
              changes: rest.changes,
              minute: rest.minute,
            });
          } else if (type === 'match_tick') {
            this.emitMessage({
              type: 'match_tick',
              matchState: rest.matchState || data.matchState,
              eventsDelta: rest.eventsDelta || [],
            });
          } else if (type === 'match_ended') {
            this.emitMessage({
              type: 'match_ended',
              finalMatchState: rest.finalMatchState || data.matchState,
            });
          } else if (type === 'request_rematch') {
            this.emitMessage({
              type: 'rematch_requested',
              byPlayerId: senderId,
            });
          } else if (type === 'accept_rematch') {
            this.emitMessage({
              type: 'rematch_accepted',
              room: data,
            });
          } else if (type === 'opponent_left' || type === 'guest_left') {
            this.emitMessage({
              type: 'opponent_left',
              message: 'غادر المنافس غرفة التحدي.',
            });
          }
        }
      }
    }, (error) => {
      console.warn('[OnlineChallenge] Firestore room snapshot error:', error);
    });
  }

  // ==========================================
  // WEBSOCKET TRANSMISSION HELPER
  // ==========================================

  private sendWs(payload: any): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(payload));
        return true;
      } catch (err) {
        console.warn('[WS Challenge] Send failed:', err);
        return false;
      }
    }
    return false;
  }

  // ==========================================
  // PUBLIC ACTIONS (Room Lifecycle & Match)
  // ==========================================

  public async createRoom(participant: {
    playerName: string;
    clubName: string;
    clubRating: number;
    tactics: any;
    squadSummary: { id: string; name: string; position: string; rating: number }[];
  }) {
    await this.connect();
    const playerId = getOrCreatePlayerId();
    let code = generateRoomCode();

    if (this.transport === 'websocket' && this.socket?.readyState === WebSocket.OPEN) {
      this.currentRoomCode = code;
      this.sendWs({
        type: 'create_room',
        code,
        playerId,
        ...participant,
      });
      return;
    }

    // Firestore Mode
    const initialHost: ChallengeParticipant = {
      playerId,
      playerName: participant.playerName,
      clubName: participant.clubName,
      clubRating: participant.clubRating,
      tactics: participant.tactics,
      squadSummary: participant.squadSummary,
      isReady: false,
      isConnected: true,
    };

    const roomData: ChallengeRoomState = {
      code,
      status: 'waiting',
      createdAt: Date.now(),
      host: initialHost,
    };

    // never overwrite somebody else's live room if the random code happens to collide
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await getDoc(doc(db, 'challenge_rooms', code));
      const dead = !existing.exists() || Date.now() - (existing.data() as any)?.lastActivity > ROOM_STALE_MS || (existing.data() as any)?.status === 'closed';
      if (dead) break;
      code = generateRoomCode();
    }
    roomData.code = code;

    const docRef = doc(db, 'challenge_rooms', code);
    await setDoc(docRef, cleanForFirestore({
      ...roomData,
      lastActivity: Date.now(),
      lastEvent: {
        type: 'room_created',
        senderId: playerId,
        timestamp: Date.now(),
      },
    }));

    this.currentRoomCode = code;
    this.cachedRoomState = roomData;
    this.lastProcessedEventTime = Date.now();
    this.subscribeFirestoreRoom(code);

    this.emitMessage({
      type: 'room_created',
      code,
      room: roomData,
    });
  }

  public async joinRoom(code: string, participant: {
    playerName: string;
    clubName: string;
    clubRating: number;
    tactics: any;
    squadSummary: { id: string; name: string; position: string; rating: number }[];
  }) {
    await this.connect();
    const cleanCode = code.trim().toUpperCase();
    const playerId = getOrCreatePlayerId();
    this.currentRoomCode = cleanCode;

    if (this.transport === 'websocket' && this.socket?.readyState === WebSocket.OPEN) {
      this.sendWs({
        type: 'join_room',
        code: cleanCode,
        playerId,
        ...participant,
      });
      return;
    }

    // Firestore Mode: claim the guest seat atomically so two people typing the same code at the
    // same moment can't both "join" (the second one used to silently overwrite the first).
    const docRef = doc(db, 'challenge_rooms', cleanCode);
    const guestParticipant: ChallengeParticipant = {
      playerId,
      playerName: participant.playerName,
      avatar: (participant as any).avatar,
      clubName: participant.clubName,
      clubRating: participant.clubRating,
      tactics: participant.tactics,
      squadSummary: participant.squadSummary,
      benchSummary: (participant as any).benchSummary,
      isReady: false,
      isConnected: true,
    };

    let updatedRoom: ChallengeRoomState;
    try {
      updatedRoom = await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists()) throw new Error('كود الغرفة غير صحيح أو أن الغرفة غير موجودة.');
        const currentRoom = snap.data() as any;
        if (currentRoom.status === 'closed' || Date.now() - (currentRoom.lastActivity || currentRoom.createdAt || 0) > ROOM_STALE_MS) {
          throw new Error('الغرفة دي انتهت. اطلب من صاحبك كود جديد.');
        }
        if (currentRoom.host?.playerId === playerId) {
          throw new Error('دي غرفتك إنت. ابعت الكود لصاحبك عشان يدخل.');
        }
        if (currentRoom.status === 'playing' || currentRoom.status === 'completed') {
          throw new Error('المباراة في هذه الغرفة بدأت بالفعل أو انتهت.');
        }
        if (currentRoom.guest && currentRoom.guest.playerId !== playerId) {
          throw new Error('غرفة التحدي ممتلئة بالفعل بمنافس آخر.');
        }
        const now = Date.now();
        tx.update(docRef, cleanForFirestore({
          guest: guestParticipant,
          status: 'ready',
          lastActivity: now,
          lastEvent: { type: 'opponent_joined', guest: guestParticipant, senderId: playerId, timestamp: now },
        }));
        return { ...currentRoom, guest: guestParticipant, status: 'ready' } as ChallengeRoomState;
      });
    } catch (err) {
      this.currentRoomCode = null;
      throw err;
    }

    this.cachedRoomState = updatedRoom;
    this.lastProcessedEventTime = Date.now();
    this.subscribeFirestoreRoom(cleanCode);

    this.emitMessage({
      type: 'room_joined',
      code: cleanCode,
      room: updatedRoom,
    });
  }

  public async toggleReady(code: string, isReady: boolean) {
    const cleanCode = code.trim().toUpperCase();
    const playerId = getOrCreatePlayerId();

    if (this.transport === 'websocket' && this.socket?.readyState === WebSocket.OPEN) {
      this.sendWs({
        type: 'toggle_ready',
        code: cleanCode,
        playerId,
        isReady,
      });
      return;
    }

    // Firestore Mode
    const docRef = doc(db, 'challenge_rooms', cleanCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data() as any;
    const isHost = data.host?.playerId === playerId;

    const updatePayload: any = {
      lastActivity: Date.now(),
      lastEvent: {
        type: 'opponent_ready_changed',
        isReady,
        senderId: playerId,
        timestamp: Date.now(),
      },
    };

    if (isHost) {
      updatePayload['host.isReady'] = isReady;
    } else {
      updatePayload['guest.isReady'] = isReady;
    }

    await updateDoc(docRef, updatePayload);
  }

  public async sendTactics(code: string, tactics: any) {
    const cleanCode = code.trim().toUpperCase();
    const playerId = getOrCreatePlayerId();

    if (this.transport === 'websocket' && this.socket?.readyState === WebSocket.OPEN) {
      this.sendWs({
        type: 'update_tactics',
        code: cleanCode,
        playerId,
        tactics,
      });
      return;
    }

    // Firestore Mode
    const docRef = doc(db, 'challenge_rooms', cleanCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data() as any;
    const isHost = data.host?.playerId === playerId;
    const updatePayload: any = {
      lastActivity: Date.now(),
    };
    if (isHost) {
      updatePayload['host.tactics'] = tactics;
    } else {
      updatePayload['guest.tactics'] = tactics;
    }
    await updateDoc(docRef, cleanForFirestore(updatePayload));
  }

  public async startMatch(code: string, initialMatchState: any) {
    const cleanCode = code.trim().toUpperCase();
    const playerId = getOrCreatePlayerId();

    if (this.transport === 'websocket' && this.socket?.readyState === WebSocket.OPEN) {
      this.sendWs({
        type: 'start_match',
        code: cleanCode,
        playerId,
        initialMatchState,
      });
      return;
    }

    // Firestore Mode
    const docRef = doc(db, 'challenge_rooms', cleanCode);
    await updateDoc(docRef, cleanForFirestore({
      status: 'playing',
      matchState: initialMatchState,
      lastActivity: Date.now(),
      lastEvent: {
        type: 'match_started',
        initialMatchState,
        senderId: playerId,
        timestamp: Date.now(),
      },
    }));
  }

  public sendMatchTick(code: string, matchState: any, eventsDelta?: any[]) {
    const cleanCode = code.trim().toUpperCase();
    const playerId = getOrCreatePlayerId();

    if (this.transport === 'websocket' && this.socket?.readyState === WebSocket.OPEN) {
      this.sendWs({
        type: 'match_tick',
        code: cleanCode,
        playerId,
        matchState,
        eventsDelta,
      });
      return;
    }

    // Firestore Mode: optimize write frequency to protect quotas while delivering live updates
    const currentMinute = matchState?.minute || 0;
    const hasSpecialEvents = Array.isArray(eventsDelta) && eventsDelta.length > 0;
    const isKeyMilestone = currentMinute === 45 || currentMinute >= 90;
    const isPeriodicTick = currentMinute % 5 === 0 && currentMinute !== this.lastTickMinute;

    if (hasSpecialEvents || isKeyMilestone || isPeriodicTick) {
      this.lastTickMinute = currentMinute;
      const docRef = doc(db, 'challenge_rooms', cleanCode);
      updateDoc(docRef, cleanForFirestore({
        matchState,
        lastActivity: Date.now(),
        lastEvent: {
          type: 'match_tick',
          matchState,
          eventsDelta: eventsDelta || [],
          senderId: playerId,
          timestamp: Date.now(),
        },
      })).catch((err) => {
        console.warn('[OnlineChallenge] Firestore tick update warning:', err);
      });
    }
  }

  public sendInGameTactics(code: string, changes: any, minute: number) {
    const cleanCode = code.trim().toUpperCase();
    const playerId = getOrCreatePlayerId();

    if (this.transport === 'websocket' && this.socket?.readyState === WebSocket.OPEN) {
      this.sendWs({
        type: 'in_game_tactics',
        code: cleanCode,
        playerId,
        changes,
        minute,
      });
      return;
    }

    // Firestore Mode
    const docRef = doc(db, 'challenge_rooms', cleanCode);
    updateDoc(docRef, cleanForFirestore({
      lastActivity: Date.now(),
      lastEvent: {
        type: 'opponent_in_game_tactics',
        changes,
        minute,
        senderId: playerId,
        timestamp: Date.now(),
      },
    })).catch((err) => {
      console.warn('[OnlineChallenge] In-game tactics update warning:', err);
    });
  }

  public endMatch(code: string, finalMatchState: any) {
    const cleanCode = code.trim().toUpperCase();
    const playerId = getOrCreatePlayerId();

    if (this.transport === 'websocket' && this.socket?.readyState === WebSocket.OPEN) {
      this.sendWs({
        type: 'match_end',
        code: cleanCode,
        playerId,
        finalMatchState,
      });
      return;
    }

    // Firestore Mode
    const docRef = doc(db, 'challenge_rooms', cleanCode);
    updateDoc(docRef, cleanForFirestore({
      status: 'completed',
      matchState: finalMatchState,
      lastActivity: Date.now(),
      lastEvent: {
        type: 'match_ended',
        finalMatchState,
        senderId: playerId,
        timestamp: Date.now(),
      },
    })).catch((err) => {
      console.warn('[OnlineChallenge] Match end update warning:', err);
    });
  }

  public requestRematch(code: string) {
    const cleanCode = code.trim().toUpperCase();
    const playerId = getOrCreatePlayerId();

    if (this.transport === 'websocket' && this.socket?.readyState === WebSocket.OPEN) {
      this.sendWs({
        type: 'request_rematch',
        code: cleanCode,
        playerId,
      });
      return;
    }

    // Firestore Mode
    const docRef = doc(db, 'challenge_rooms', cleanCode);
    updateDoc(docRef, {
      lastActivity: Date.now(),
      lastEvent: {
        type: 'request_rematch',
        senderId: playerId,
        timestamp: Date.now(),
      },
    }).catch(() => {});
  }

  public async acceptRematch(code: string) {
    const cleanCode = code.trim().toUpperCase();
    const playerId = getOrCreatePlayerId();

    if (this.transport === 'websocket' && this.socket?.readyState === WebSocket.OPEN) {
      this.sendWs({
        type: 'accept_rematch',
        code: cleanCode,
        playerId,
      });
      return;
    }

    // Firestore Mode: reset room to ready state
    const docRef = doc(db, 'challenge_rooms', cleanCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data() as any;
    const resetRoom = {
      ...data,
      status: 'ready',
      matchState: null,
      host: { ...data.host, isReady: false },
      guest: data.guest ? { ...data.guest, isReady: false } : undefined,
    };

    await updateDoc(docRef, cleanForFirestore({
      ...resetRoom,
      lastActivity: Date.now(),
      lastEvent: {
        type: 'accept_rematch',
        senderId: playerId,
        timestamp: Date.now(),
      },
    }));

    this.emitMessage({
      type: 'rematch_accepted',
      room: resetRoom,
    });
  }

  public leaveRoom(code: string) {
    const cleanCode = code.trim().toUpperCase();
    const playerId = getOrCreatePlayerId();

    if (this.transport === 'websocket' && this.socket?.readyState === WebSocket.OPEN) {
      this.sendWs({
        type: 'leave_room',
        code: cleanCode,
        playerId,
      });
    } else {
      // Firestore Mode: notify opponent and clean room
      const docRef = doc(db, 'challenge_rooms', cleanCode);
      getDoc(docRef).then((snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data.host?.playerId === playerId) {
            // Host left -> tell the guest first (soft close), then remove the room
            updateDoc(docRef, { status: 'closed', lastActivity: Date.now(), lastEvent: { type: 'opponent_left', senderId: playerId, timestamp: Date.now() } })
              .catch(() => {})
              .finally(() => { setTimeout(() => deleteDoc(docRef).catch(() => {}), 4000); });
          } else {
            // Guest left -> mark room waiting
            updateDoc(docRef, {
              guest: null,
              status: 'waiting',
              lastActivity: Date.now(),
              lastEvent: {
                type: 'opponent_left',
                senderId: playerId,
                timestamp: Date.now(),
              },
            }).catch(() => {});
          }
        }
      }).catch(() => {});
    }

    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
      this.firestoreUnsubscribe = null;
    }
    this.currentRoomCode = null;
    this.cachedRoomState = null;
  }

  // ==========================================
  // RANDOM ONLINE MATCHMAKING
  // ==========================================

  public async findRandomMatch(participant: {
    playerName: string;
    clubName: string;
    clubRating: number;
    avatar?: string;
    tactics: any;
    squadSummary: { id: string; name: string; position: string; rating: number }[];
    benchSummary?: { id: string; name: string; position: string; rating: number }[];
  }) {
    await this.connect();
    const playerId = getOrCreatePlayerId();

    if (this.transport === 'websocket' && this.socket?.readyState === WebSocket.OPEN) {
      this.sendWs({
        type: 'find_random_match',
        participant: {
          playerId,
          ...participant,
        },
      });
      return;
    }

    // Phone app / no relay server: real matchmaking through a Firestore queue
    await this.startFirestoreMatchmaking(participant, playerId);
  }

  /** Emits a clearly-labelled practice match against a virtual coach. */
  private startBotMatch(participant: any, reason: 'timeout' | 'requested') {
    const playerId = getOrCreatePlayerId();
    const botClubNames = ['نادي النجوم الدولي', 'أكاديمية الفرسان', 'اتحاد الأبطال', 'نادي الصقور', 'كتيبة الأساطير'];
    const botCoachNames = ['كابتن طارق السعيد', 'المدرب حسام البدري', 'كابتن أحمد سامي', 'المدرب إيهاب جلال', 'كابتن علي ماهر'];
    const randomBotClub = botClubNames[Math.floor(Math.random() * botClubNames.length)];
    const randomBotCoach = botCoachNames[Math.floor(Math.random() * botCoachNames.length)];
    const code = generateRoomCode();

    const fallbackRoom: ChallengeRoomState = {
      code,
      status: 'playing',
      createdAt: Date.now(),
      host: {
        playerId,
        ...participant,
        isReady: true,
        isConnected: true,
      },
      guest: {
        playerId: 'bot_' + Date.now(),
        playerName: randomBotCoach,
        clubName: randomBotClub,
        clubRating: Math.max(65, Math.min(88, participant.clubRating + Math.floor(Math.random() * 6 - 3))),
        tactics: {
          formation: '4-3-3',
          mentality: 'balanced',
          passingStyle: 'mixed',
          pressingIntensity: 'balanced',
          tempo: 'balanced',
        },
        squadSummary: [],
        benchSummary: [],
        isReady: true,
        isConnected: true,
      },
    };

    this.currentRoomCode = code;
    this.cachedRoomState = fallbackRoom;

    setTimeout(() => {
      this.emitMessage({
        type: 'random_match_matched',
        code,
        role: 'host',
        room: fallbackRoom,
        opponent: fallbackRoom.guest,
        isBot: true,
        botReason: reason,
      });
    }, 700);
  }

  private stopFirestoreMatchmaking(removeEntry: boolean) {
    this.queueActive = false;
    if (this.queueTimer) { clearInterval(this.queueTimer); this.queueTimer = null; }
    if (this.queueTimeout) { clearTimeout(this.queueTimeout); this.queueTimeout = null; }
    if (this.queueUnsub) { this.queueUnsub(); this.queueUnsub = null; }
    if (removeEntry) {
      deleteDoc(doc(db, 'challenge_queue', getOrCreatePlayerId())).catch(() => {});
    }
  }

  private finishFirestoreMatch(room: any, myId: string) {
    this.stopFirestoreMatchmaking(false);
    // our queue entry has done its job
    setTimeout(() => deleteDoc(doc(db, 'challenge_queue', myId)).catch(() => {}), 1500);
    const role = room.host?.playerId === myId ? 'host' : 'guest';
    this.currentRoomCode = room.code;
    this.cachedRoomState = room;
    this.subscribeFirestoreRoom(room.code);
    this.emitMessage({
      type: 'random_match_matched',
      code: room.code,
      role,
      room,
      opponent: role === 'host' ? room.guest : room.host,
      isBot: false,
    });
  }

  private async startFirestoreMatchmaking(participant: any, playerId: string) {
    this.stopFirestoreMatchmaking(true);
    this.queueActive = true;
    const myRef = doc(db, 'challenge_queue', playerId);
    const now = Date.now();
    await setDoc(myRef, cleanForFirestore({
      playerId,
      participant: { playerId, ...participant },
      status: 'waiting',
      roomCode: null,
      createdAt: now,
      lastSeen: now,
    }));
    this.emitMessage({ type: 'matchmaking_searching', queueSize: 1 });

    // 1) somebody else may claim us: wait for our own entry to flip to "matched"
    this.queueUnsub = onSnapshot(myRef, async (snap) => {
      const d: any = snap.data();
      if (!this.queueActive || !d || d.status !== 'matched' || !d.roomCode) return;
      try {
        const roomSnap = await getDoc(doc(db, 'challenge_rooms', d.roomCode));
        if (roomSnap.exists() && this.queueActive) this.finishFirestoreMatch(roomSnap.data(), playerId);
      } catch (err) {
        console.warn('[OnlineChallenge] could not open matched room:', err);
      }
    }, () => {});

    // 2) or we claim somebody. Only the player with the larger id claims, so two people who see
    //    each other at the same instant never create two different rooms.
    const tick = async () => {
      if (!this.queueActive) return;
      try {
        await updateDoc(myRef, { lastSeen: Date.now() });
        const snap = await getDocs(query(collection(db, 'challenge_queue'), where('status', '==', 'waiting')));
        const t = Date.now();
        const others = snap.docs
          .map(d => d.data() as any)
          .filter(d => d.playerId !== playerId && t - (d.lastSeen || 0) < QUEUE_ENTRY_FRESH_MS);
        this.emitMessage({ type: 'matchmaking_searching', queueSize: others.length + 1 });
        const candidates = others.filter(o => o.playerId < playerId).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        for (const c of candidates) {
          if (!this.queueActive) return;
          const room = await this.tryClaimOpponent(myRef, doc(db, 'challenge_queue', c.playerId), playerId);
          if (room) { this.finishFirestoreMatch(room, playerId); return; }
        }
      } catch (err) {
        console.warn('[OnlineChallenge] matchmaking poll warning:', err);
      }
    };
    this.queueTimer = setInterval(tick, QUEUE_HEARTBEAT_MS);
    void tick();

    // 3) nobody real around: be honest and offer a practice match instead
    this.queueTimeout = setTimeout(() => {
      if (!this.queueActive) return;
      this.stopFirestoreMatchmaking(true);
      this.startBotMatch(participant, 'timeout');
    }, MATCHMAKING_TIMEOUT_MS);
  }

  private async tryClaimOpponent(myRef: any, theirRef: any, myId: string): Promise<any | null> {
    const code = generateRoomCode();
    const roomRef = doc(db, 'challenge_rooms', code);
    try {
      return await runTransaction(db, async (tx) => {
        const mine = await tx.get(myRef);
        const theirs = await tx.get(theirRef);
        const m: any = mine.data();
        const o: any = theirs.data();
        if (!mine.exists() || m.status !== 'waiting') return null;
        if (!theirs.exists() || o.status !== 'waiting' || Date.now() - (o.lastSeen || 0) > QUEUE_ENTRY_FRESH_MS + 3000) return null;
        const now = Date.now();
        const room = {
          code,
          status: 'playing',
          createdAt: now,
          host: { ...o.participant, isReady: true, isConnected: true },
          guest: { ...m.participant, isReady: true, isConnected: true },
          matchState: { minute: 0, homeScore: 0, awayScore: 0, status: 'playing' },
          lastActivity: now,
          lastEvent: { type: 'room_created', senderId: myId, timestamp: now },
        };
        tx.set(roomRef, cleanForFirestore(room));
        tx.update(theirRef, { status: 'matched', roomCode: code });
        tx.update(myRef, { status: 'matched', roomCode: code });
        return room;
      });
    } catch (err) {
      return null; // somebody else got there first; try the next candidate on the next poll
    }
  }

  public cancelMatchmaking() {
    const playerId = getOrCreatePlayerId();
    if (this.transport === 'websocket' && this.socket?.readyState === WebSocket.OPEN) {
      this.sendWs({
        type: 'cancel_matchmaking',
        playerId,
      });
    }
    if (this.queueActive) this.stopFirestoreMatchmaking(true);
  }

  public requestBotMatch(participant: {
    playerName: string;
    clubName: string;
    clubRating: number;
    avatar?: string;
    tactics: any;
    squadSummary: { id: string; name: string; position: string; rating: number }[];
    benchSummary?: { id: string; name: string; position: string; rating: number }[];
  }) {
    const playerId = getOrCreatePlayerId();
    if (this.transport === 'websocket' && this.socket?.readyState === WebSocket.OPEN) {
      this.sendWs({
        type: 'request_bot_match',
        participant: {
          playerId,
          ...participant,
        },
      });
    } else {
      if (this.queueActive) this.stopFirestoreMatchmaking(true);
      this.startBotMatch(participant, 'requested');
    }
  }

  // ==========================================
  // DAILY COACH RANKING API & SYNC
  // ==========================================

  public async fetchDailyRanking(): Promise<DailyCoachRankEntry[]> {
    // 1) Firestore: works on the phone app and on the web, no server needed
    try {
      const snap = await getDocs(query(collection(db, 'challenge_daily_ranking'), where('dateKey', '==', todayKey())));
      const rows = snap.docs.map(d => d.data() as any).filter(r => r && r.playerId);
      rows.sort((a, b) =>
        (b.points || 0) - (a.points || 0) ||
        ((b.goalsFor || 0) - (b.goalsAgainst || 0)) - ((a.goalsFor || 0) - (a.goalsAgainst || 0)) ||
        (b.goalsFor || 0) - (a.goalsFor || 0) ||
        (a.played || 0) - (b.played || 0)
      );
      if (rows.length > 0) {
        return rows.slice(0, 50).map((r, i) => ({
          rank: i + 1,
          playerId: r.playerId,
          coachName: r.coachName || 'مدرب',
          avatar: r.avatar || undefined,
          clubName: r.clubName || '',
          clubRating: r.clubRating || 70,
          wins: r.wins || 0,
          losses: r.losses || 0,
          draws: r.draws || 0,
          matchesPlayed: r.played || 0,
          lastActiveTimestamp: r.lastActive || 0,
          points: r.points || 0,
          goalDifference: (r.goalsFor || 0) - (r.goalsAgainst || 0),
        }));
      }
    } catch (err) {
      console.warn('[OnlineChallenge] Firestore ranking unavailable:', err);
    }
    // 2) Relay server (web build only)
    try {
      const res = await fetch('/api/pvp/daily-ranking');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.ranking)) {
          return data.ranking;
        }
      }
    } catch (err) {
      console.warn('[OnlineChallenge] Failed to fetch daily ranking via API:', err);
    }
    return [];
  }

  public async recordMatchResult(result: {
    roomCode: string;
    host: { playerId: string; playerName: string; clubName: string; avatar?: string; clubRating: number };
    guest: { playerId: string; playerName: string; clubName: string; avatar?: string; clubRating: number };
    homeScore: number;
    awayScore: number;
  }) {
    const myId = getOrCreatePlayerId();
    const iAmHost = result.host.playerId === myId;
    const iAmGuest = result.guest.playerId === myId;
    const opponentId = iAmHost ? result.guest.playerId : result.host.playerId;
    const isPractice = String(opponentId || '').startsWith('bot_');

    // Practice matches against the virtual coach never count towards the daily ranking
    if (isPractice) return;

    // 1. Relay server paths (web build)
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendWs({ type: 'record_match_result', result });
    }
    try {
      await fetch('/api/pvp/record-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
    } catch {
      // no relay server (phone app) - Firestore below is the source of truth there
    }

    // 2. Firestore: every phone records only ITS OWN line, exactly once
    if (!iAmHost && !iAmGuest) return;
    try {
      const me = iAmHost ? result.host : result.guest;
      const gf = iAmHost ? result.homeScore : result.awayScore;
      const ga = iAmHost ? result.awayScore : result.homeScore;
      const win = gf > ga ? 1 : 0;
      const draw = gf === ga ? 1 : 0;
      const loss = gf < ga ? 1 : 0;
      const dateKey = todayKey();
      await setDoc(doc(db, 'challenge_daily_ranking', `${dateKey}_${myId}`), {
        dateKey,
        playerId: myId,
        coachName: me.playerName,
        avatar: me.avatar && !String(me.avatar).startsWith('data:') ? me.avatar : '',
        clubName: me.clubName,
        clubRating: me.clubRating,
        played: increment(1),
        wins: increment(win),
        draws: increment(draw),
        losses: increment(loss),
        goalsFor: increment(gf),
        goalsAgainst: increment(ga),
        points: increment(win * 3 + draw),
        lastActive: Date.now(),
      }, { merge: true });
    } catch (err) {
      console.warn('[OnlineChallenge] Failed to record ranking line in Firestore:', err);
    }
  }

  public setCurrentRoomCode(code: string | null) {
    this.currentRoomCode = code;
  }
}

export const challengeClient = new OnlineChallengeClient();

// ==========================================
// LOCAL STORAGE HISTORY
// ==========================================

export function getLocalChallengeHistory(): ChallengeHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHALLENGE_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalChallengeResult(item: Omit<ChallengeHistoryItem, 'id' | 'timestamp'>): void {
  try {
    const history = getLocalChallengeHistory();
    const newItem: ChallengeHistoryItem = {
      ...item,
      id: 'ch_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
    };
    // Keep max 30 matches locally to conserve device storage
    const updated = [newItem, ...history].slice(0, 30);
    localStorage.setItem(STORAGE_KEY_CHALLENGE_HISTORY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[OnlineChallenge] Failed to save local match history:', err);
  }
}

export function clearLocalChallengeHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CHALLENGE_HISTORY);
  } catch {
    // ignore
  }
}
