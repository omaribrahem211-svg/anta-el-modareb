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
  status: 'waiting' | 'ready' | 'playing' | 'completed';
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
}

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
  private lastTickMinute = -1;

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
      if (data.lastEvent && data.lastEvent.timestamp > this.lastProcessedEventTime) {
        this.lastProcessedEventTime = data.lastEvent.timestamp;
        const { type, senderId, ...rest } = data.lastEvent;

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
    const code = generateRoomCode();

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

    // Firestore Mode
    const docRef = doc(db, 'challenge_rooms', cleanCode);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      throw new Error('كود الغرفة غير صحيح أو أن الغرفة غير موجودة.');
    }

    const currentRoom = snap.data() as any;
    if (currentRoom.status === 'playing' || currentRoom.status === 'completed') {
      throw new Error('المباراة في هذه الغرفة بدأت بالفعل أو انتهت.');
    }

    if (currentRoom.guest && currentRoom.guest.playerId !== playerId) {
      throw new Error('غرفة التحدي ممتلئة بالفعل بمنافس آخر.');
    }

    const guestParticipant: ChallengeParticipant = {
      playerId,
      playerName: participant.playerName,
      clubName: participant.clubName,
      clubRating: participant.clubRating,
      tactics: participant.tactics,
      squadSummary: participant.squadSummary,
      isReady: false,
      isConnected: true,
    };

    const updatedRoom: ChallengeRoomState = {
      ...currentRoom,
      guest: guestParticipant,
      status: 'ready',
    };

    await updateDoc(docRef, cleanForFirestore({
      guest: guestParticipant,
      status: 'ready',
      lastActivity: Date.now(),
      lastEvent: {
        type: 'opponent_joined',
        guest: guestParticipant,
        senderId: playerId,
        timestamp: Date.now(),
      },
    }));

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
            // Host left -> delete or close room
            deleteDoc(docRef).catch(() => {});
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

    // Fallback: If socket unavailable, simulate fast matchmaking bot
    const botClubNames = ['نادي النجوم الدولي', 'أكاديمية الفرسان', 'اتحاد الأبطال', 'نادي الصقور أونلاين', 'كتيبة الأساطير'];
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
      });
    }, 1500);
  }

  public cancelMatchmaking() {
    const playerId = getOrCreatePlayerId();
    if (this.transport === 'websocket' && this.socket?.readyState === WebSocket.OPEN) {
      this.sendWs({
        type: 'cancel_matchmaking',
        playerId,
      });
    }
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
      this.findRandomMatch(participant);
    }
  }

  // ==========================================
  // DAILY COACH RANKING API & SYNC
  // ==========================================

  public async fetchDailyRanking(): Promise<DailyCoachRankEntry[]> {
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
    // 1. Send via WebSocket if open
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendWs({
        type: 'record_match_result',
        result,
      });
    }

    // 2. Also send via REST API to guarantee registration in server RAM
    try {
      await fetch('/api/pvp/record-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
    } catch (err) {
      console.warn('[OnlineChallenge] Failed to post match result to server API:', err);
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
