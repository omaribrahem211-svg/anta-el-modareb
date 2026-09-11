/**
 * Online Challenge WebSocket Client Service
 * 
 * Manages live WebSocket communication with the server relay.
 * All challenge data and match progress exist purely in RAM on the relay server.
 * Match history is stored purely in client-side localStorage to minimize network/Firebase overhead.
 */

export interface ChallengeParticipant {
  playerId: string;
  playerName: string;
  clubName: string;
  clubRating: number;
  tactics: any;
  squadSummary?: { id: string; name: string; position: string; rating: number }[];
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

export function getWebSocketServerUrl(): string {
  // If explicitly configured in VITE_WS_URL
  if (typeof import.meta.env.VITE_WS_URL === 'string' && import.meta.env.VITE_WS_URL.trim() !== '') {
    const envUrl = import.meta.env.VITE_WS_URL.trim();
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const isDevHost = window.location.hostname.includes('ais-dev-');
      const isEnvPreHost = envUrl.includes('ais-pre-');
      // If running inside the Dev environment before deployment, route to the live dev relay
      if (isDevHost && isEnvPreHost) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}/ws/challenge`;
      }
    }
    return envUrl;
  }

  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocal && (window as any).Capacitor?.isNativePlatform?.()) {
    return 'wss://ais-pre-oddg67ylxtk2h3cb3joxcv-830970277363.europe-west2.run.app/ws/challenge';
  }
  if (typeof window !== 'undefined' && window.location?.host) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/challenge`;
  }
  return 'wss://ais-pre-oddg67ylxtk2h3cb3joxcv-830970277363.europe-west2.run.app/ws/challenge';
}

type MessageListener = (data: any) => void;
type StatusListener = (status: 'disconnected' | 'connecting' | 'connected') => void;

class OnlineChallengeClient {
  private socket: WebSocket | null = null;
  private messageListeners: Set<MessageListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 6;
  private reconnectTimer: any = null;
  private currentRoomCode: string | null = null;
  private isIntentionalClose = false;

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
    this.statusListeners.forEach(listener => listener(status));
  }

  public connect(): Promise<WebSocket> {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve(this.socket);
    }

    this.isIntentionalClose = false;
    this.notifyStatus('connecting');

    return new Promise((resolve, reject) => {
      try {
        const url = getWebSocketServerUrl();
        const ws = new WebSocket(url);

        ws.onopen = () => {
          this.socket = ws;
          this.reconnectAttempts = 0;
          this.notifyStatus('connected');
          console.log('[WS Challenge] Connected to live relay');

          // If reconnecting with a room code, re-sync immediately
          if (this.currentRoomCode) {
            this.send({
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
            this.messageListeners.forEach(listener => listener(data));
          } catch (err) {
            console.warn('[WS Challenge] Invalid JSON received:', err);
          }
        };

        ws.onerror = (err) => {
          console.warn('[WS Challenge] WebSocket error:', err);
        };

        ws.onclose = (e) => {
          this.socket = null;
          this.notifyStatus('disconnected');

          if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
            console.log(`[WS Challenge] Disconnected. Reconnecting in ${Math.round(delay)}ms... (Attempt ${this.reconnectAttempts})`);
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => {
              this.connect().catch(() => {});
            }, delay);
          }
        };
      } catch (err) {
        this.notifyStatus('disconnected');
        reject(err);
      }
    });
  }

  public disconnect() {
    this.isIntentionalClose = true;
    clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.currentRoomCode = null;
    this.notifyStatus('disconnected');
  }

  public send(payload: any): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(payload));
        return true;
      } catch (err) {
        console.warn('[WS Challenge] Send failed:', err);
        return false;
      }
    } else {
      // Try connecting and sending
      this.connect().then(() => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify(payload));
        }
      }).catch(() => {});
      return false;
    }
  }

  public async createRoom(participant: {
    playerName: string;
    clubName: string;
    clubRating: number;
    tactics: any;
    squadSummary: { id: string; name: string; position: string; rating: number }[];
  }) {
    await this.connect();
    const playerId = getOrCreatePlayerId();
    this.send({
      type: 'create_room',
      playerId,
      ...participant,
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
    this.currentRoomCode = cleanCode;
    const playerId = getOrCreatePlayerId();
    this.send({
      type: 'join_room',
      code: cleanCode,
      playerId,
      ...participant,
    });
  }

  public toggleReady(code: string, isReady: boolean) {
    this.currentRoomCode = code;
    this.send({
      type: 'toggle_ready',
      code,
      playerId: getOrCreatePlayerId(),
      isReady,
    });
  }

  public sendTactics(code: string, tactics: any) {
    this.send({
      type: 'update_tactics',
      code,
      playerId: getOrCreatePlayerId(),
      tactics,
    });
  }

  public startMatch(code: string, initialMatchState: any) {
    this.send({
      type: 'start_match',
      code,
      playerId: getOrCreatePlayerId(),
      initialMatchState,
    });
  }

  public sendMatchTick(code: string, matchState: any, eventsDelta?: any[]) {
    this.send({
      type: 'match_tick',
      code,
      playerId: getOrCreatePlayerId(),
      matchState,
      eventsDelta,
    });
  }

  public sendInGameTactics(code: string, changes: any, minute: number) {
    this.send({
      type: 'in_game_tactics',
      code,
      playerId: getOrCreatePlayerId(),
      changes,
      minute,
    });
  }

  public endMatch(code: string, finalMatchState: any) {
    this.send({
      type: 'match_end',
      code,
      playerId: getOrCreatePlayerId(),
      finalMatchState,
    });
  }

  public requestRematch(code: string) {
    this.send({
      type: 'request_rematch',
      code,
      playerId: getOrCreatePlayerId(),
    });
  }

  public acceptRematch(code: string) {
    this.send({
      type: 'accept_rematch',
      code,
      playerId: getOrCreatePlayerId(),
    });
  }

  public leaveRoom(code: string) {
    this.send({
      type: 'leave_room',
      code,
      playerId: getOrCreatePlayerId(),
    });
    this.currentRoomCode = null;
  }

  public setCurrentRoomCode(code: string | null) {
    this.currentRoomCode = code;
  }
}

export const challengeClient = new OnlineChallengeClient();

// ==========================================
// LOCAL STORAGE HISTORY (Zero Firebase storage)
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
    console.warn('[WS Challenge] Failed to save local match history:', err);
  }
}

export function clearLocalChallengeHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CHALLENGE_HISTORY);
  } catch {
    // ignore
  }
}
