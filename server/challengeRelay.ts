import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export interface ParticipantData {
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
}

export interface RoomParticipant extends ParticipantData {
  ws: WebSocket | null;
  isReady: boolean;
  disconnectedAt: number | null;
}

export interface ChallengeRoom {
  code: string;
  createdAt: number;
  lastActivity: number;
  status: 'waiting' | 'ready' | 'playing' | 'completed';
  host: RoomParticipant;
  guest?: RoomParticipant;
  matchState?: any;
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

export interface MatchmakingWaiter {
  ws: WebSocket;
  playerId: string;
  participant: ParticipantData;
  timestamp: number;
}

export function broadcastDailyRanking(wss: WebSocketServer, ranking?: DailyCoachRankEntry[]) {
  const payload = JSON.stringify({
    type: 'daily_ranking_updated',
    date: activeDayKey,
    ranking: ranking || getTop50DailyRanking(),
  });
  wss.clients.forEach((client: any) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch {}
    }
  });
}

// In-Memory RAM Storage only - ZERO database persistence
const rooms = new Map<string, ChallengeRoom>();
const matchmakingQueue: MatchmakingWaiter[] = [];

// Daily In-Memory Ranking in RAM (Reset every midnight / new day)
const dailyCoachesMap = new Map<string, Omit<DailyCoachRankEntry, 'rank'>>();
const recordedMatchKeys = new Set<string>();

export function getTodayDateKey(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

let activeDayKey = getTodayDateKey();

export function checkAndResetIfNewDay(): void {
  const currentToday = getTodayDateKey();
  if (currentToday !== activeDayKey) {
    console.log(`[Daily Ranking] Date rolled over from ${activeDayKey} to ${currentToday}. Resetting RAM leaderboard to 0.`);
    activeDayKey = currentToday;
    dailyCoachesMap.clear();
    recordedMatchKeys.clear();
  }
}

export function getTop50DailyRanking(): DailyCoachRankEntry[] {
  checkAndResetIfNewDay();
  const all = Array.from(dailyCoachesMap.values());
  
  // Sort primarily by wins (descending)
  // Tie-breaker: fewer matches played to achieve those wins (efficiency)
  // Second tie-breaker: most recent activity
  all.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.matchesPlayed !== b.matchesPlayed) return a.matchesPlayed - b.matchesPlayed;
    return b.lastActiveTimestamp - a.lastActiveTimestamp;
  });

  return all.slice(0, 50).map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}

export function recordMatchResultInRAM(data: {
  roomCode?: string;
  host: { playerId: string; playerName: string; clubName: string; avatar?: string; clubRating: number };
  guest: { playerId: string; playerName: string; clubName: string; avatar?: string; clubRating: number };
  homeScore: number;
  awayScore: number;
}): DailyCoachRankEntry[] {
  checkAndResetIfNewDay();

  const matchKey = `${activeDayKey}_${data.roomCode || `${data.host.playerId}_${data.guest.playerId}_${data.homeScore}_${data.awayScore}`}`;
  if (recordedMatchKeys.has(matchKey)) {
    return getTop50DailyRanking();
  }
  recordedMatchKeys.add(matchKey);

  const isHomeWin = data.homeScore > data.awayScore;
  const isAwayWin = data.awayScore > data.homeScore;
  const isDraw = data.homeScore === data.awayScore;

  // 1. Update Host
  if (data.host && data.host.playerId) {
    const hostEntry = dailyCoachesMap.get(data.host.playerId) || {
      playerId: data.host.playerId,
      coachName: data.host.playerName || 'مدرب',
      avatar: data.host.avatar,
      clubName: data.host.clubName || 'نادي التحدي',
      clubRating: data.host.clubRating || 70,
      wins: 0,
      losses: 0,
      draws: 0,
      matchesPlayed: 0,
      lastActiveTimestamp: Date.now(),
    };
    hostEntry.matchesPlayed += 1;
    if (isHomeWin) hostEntry.wins += 1;
    else if (isDraw) hostEntry.draws += 1;
    else hostEntry.losses += 1;
    hostEntry.lastActiveTimestamp = Date.now();
    if (data.host.playerName) hostEntry.coachName = data.host.playerName;
    if (data.host.avatar) hostEntry.avatar = data.host.avatar;
    if (data.host.clubName) hostEntry.clubName = data.host.clubName;
    dailyCoachesMap.set(data.host.playerId, hostEntry);
  }

  // 2. Update Guest
  if (data.guest && data.guest.playerId && !data.guest.playerId.startsWith('bot_')) {
    const guestEntry = dailyCoachesMap.get(data.guest.playerId) || {
      playerId: data.guest.playerId,
      coachName: data.guest.playerName || 'مدرب',
      avatar: data.guest.avatar,
      clubName: data.guest.clubName || 'نادي التحدي',
      clubRating: data.guest.clubRating || 70,
      wins: 0,
      losses: 0,
      draws: 0,
      matchesPlayed: 0,
      lastActiveTimestamp: Date.now(),
    };
    guestEntry.matchesPlayed += 1;
    if (isAwayWin) guestEntry.wins += 1;
    else if (isDraw) guestEntry.draws += 1;
    else guestEntry.losses += 1;
    guestEntry.lastActiveTimestamp = Date.now();
    if (data.guest.playerName) guestEntry.coachName = data.guest.playerName;
    if (data.guest.avatar) guestEntry.avatar = data.guest.avatar;
    if (data.guest.clubName) guestEntry.clubName = data.guest.clubName;
    dailyCoachesMap.set(data.guest.playerId, guestEntry);
  }

  return getTop50DailyRanking();
}

// Generate distinct, clean 6-character room codes (avoiding confusing glyphs like 0/O, 1/I)
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  // Guarantee uniqueness
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}

function safeSend(ws: WebSocket | null | undefined, data: any) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch (err) {
      console.warn('[WS Relay] Failed to send message:', err);
    }
  }
}

function sanitizeParticipant(p?: RoomParticipant) {
  if (!p) return null;
  const { ws, ...rest } = p;
  return {
    ...rest,
    isConnected: ws !== null && ws.readyState === WebSocket.OPEN,
  };
}

function sanitizeRoom(room: ChallengeRoom) {
  return {
    code: room.code,
    status: room.status,
    createdAt: room.createdAt,
    host: sanitizeParticipant(room.host),
    guest: sanitizeParticipant(room.guest),
    matchState: room.matchState,
  };
}

/**
 * Initializes the pure in-memory WebSocket relay server attached to the HTTP server.
 * Handles room creation, code-based matching, bidirectional live message relay, and auto-cleanup.
 */
export function setupChallengeWebSocketServer(server: HttpServer) {
  const wss = new WebSocketServer({ 
    server, 
    path: '/ws/challenge' 
  });

  console.log('[WS Relay] Online Challenge WebSocket Relay mounted on /ws/challenge');

  // Heartbeat interval to detect stale socket connections
  const pingInterval = setInterval(() => {
    wss.clients.forEach((client: any) => {
      if (client.isAlive === false) {
        return client.terminate();
      }
      client.isAlive = false;
      try {
        client.ping();
      } catch {
        // ignore
      }
    });
  }, 30000);

  // Periodic memory garbage collection: purges rooms after inactivity or grace period
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms.entries()) {
      // 1. If room inactive for > 30 minutes, delete
      if (now - room.lastActivity > 30 * 60 * 1000) {
        console.log(`[WS Relay] Purging inactive room from RAM: ${code}`);
        rooms.delete(code);
        continue;
      }

      // 2. If both host and guest are disconnected for > 90 seconds, delete
      const hostDead = room.host.disconnectedAt && (now - room.host.disconnectedAt > 90000);
      const guestDead = !room.guest || (room.guest.disconnectedAt && (now - room.guest.disconnectedAt > 90000));
      if (hostDead && guestDead) {
        console.log(`[WS Relay] Purging abandoned room from RAM: ${code}`);
        rooms.delete(code);
      }
    }
  }, 15000);

  wss.on('close', () => {
    clearInterval(pingInterval);
    clearInterval(cleanupInterval);
  });

  wss.on('connection', (ws: any) => {
    ws.isAlive = true;
    let currentRoomCode: string | null = null;
    let currentPlayerId: string | null = null;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (messageRaw: string) => {
      let data: any;
      try {
        data = JSON.parse(messageRaw.toString());
      } catch {
        return safeSend(ws, { type: 'error', message: 'تنسيق رسالة غير صالح' });
      }

      const { type } = data;

      // 1. CREATE ROOM
      if (type === 'create_room') {
        const { playerId, playerName, clubName, clubRating, tactics, squadSummary } = data;
        if (!playerId || !playerName || !clubName) {
          return safeSend(ws, { type: 'error', message: 'بيانات المدرب والنادي مطلوبة لإنشاء التحدي' });
        }

        const code = generateRoomCode();
        currentRoomCode = code;
        currentPlayerId = playerId;

        const room: ChallengeRoom = {
          code,
          createdAt: Date.now(),
          lastActivity: Date.now(),
          status: 'waiting',
          host: {
            playerId,
            playerName,
            clubName,
            clubRating: clubRating || 70,
            tactics: tactics || {},
            squadSummary: squadSummary || [],
            ws,
            isReady: false,
            disconnectedAt: null,
          },
        };

        rooms.set(code, room);
        console.log(`[WS Relay] Room created in RAM: ${code} by ${playerName} (${clubName})`);

        return safeSend(ws, {
          type: 'room_created',
          code,
          role: 'host',
          room: sanitizeRoom(room),
        });
      }

      // 2. JOIN ROOM
      if (type === 'join_room') {
        const rawCode = (data.code || '').trim().toUpperCase();
        const { playerId, playerName, clubName, clubRating, tactics, squadSummary } = data;

        if (!rawCode) {
          return safeSend(ws, { type: 'error', message: 'يرجى إدخال كود الغرفة' });
        }

        const room = rooms.get(rawCode);
        if (!room) {
          return safeSend(ws, { type: 'error', message: 'كود الغرفة غير موجود أو انتهت صلاحيته' });
        }

        room.lastActivity = Date.now();

        // Check if host rejoining
        if (room.host.playerId === playerId) {
          room.host.ws = ws;
          room.host.disconnectedAt = null;
          currentRoomCode = rawCode;
          currentPlayerId = playerId;
          return safeSend(ws, {
            type: 'room_joined',
            code: rawCode,
            role: 'host',
            room: sanitizeRoom(room),
          });
        }

        // Check if guest rejoining
        if (room.guest && room.guest.playerId === playerId) {
          room.guest.ws = ws;
          room.guest.disconnectedAt = null;
          currentRoomCode = rawCode;
          currentPlayerId = playerId;
          return safeSend(ws, {
            type: 'room_joined',
            code: rawCode,
            role: 'guest',
            room: sanitizeRoom(room),
          });
        }

        // Check if full
        if (room.guest && room.guest.ws && room.guest.ws.readyState === WebSocket.OPEN) {
          return safeSend(ws, { type: 'error', message: 'غرفة التحدي ممتلئة بالكامل' });
        }

        // Add guest
        room.guest = {
          playerId,
          playerName,
          clubName,
          clubRating: clubRating || 70,
          tactics: tactics || {},
          squadSummary: squadSummary || [],
          ws,
          isReady: false,
          disconnectedAt: null,
        };
        room.status = 'ready';
        currentRoomCode = rawCode;
        currentPlayerId = playerId;

        console.log(`[WS Relay] Guest joined room: ${rawCode} (${playerName})`);

        // Send to guest
        safeSend(ws, {
          type: 'room_joined',
          code: rawCode,
          role: 'guest',
          room: sanitizeRoom(room),
        });

        // Notify host
        safeSend(room.host.ws, {
          type: 'opponent_joined',
          guest: sanitizeParticipant(room.guest),
          room: sanitizeRoom(room),
        });
        return;
      }

      // ----------------------------------------------------
      // NON-ROOM-BOUND MESSAGES: MATCHMAKING & DAILY RANKING
      // ----------------------------------------------------

      // A. GET DAILY RANKING
      if (type === 'get_daily_ranking') {
        return safeSend(ws, {
          type: 'daily_ranking',
          date: activeDayKey,
          ranking: getTop50DailyRanking(),
        });
      }

      // B. RECORD MATCH RESULT (e.g. from completed room or fallback)
      if (type === 'record_match_result') {
        if (data.result) {
          const updatedRanking = recordMatchResultInRAM(data.result);
          broadcastDailyRanking(wss, updatedRanking);
          return safeSend(ws, {
            type: 'match_result_recorded',
            ranking: updatedRanking,
          });
        }
        return;
      }

      // C. FIND RANDOM MATCH (MATCHMAKING)
      if (type === 'find_random_match') {
        const { participant } = data;
        if (!participant || !participant.playerId) {
          return safeSend(ws, { type: 'error', message: 'بيانات المدرب مطلوبة لدخول التحدي العشوائي' });
        }

        currentRoomCode = null;
        currentPlayerId = participant.playerId;

        // Purge dead sockets or existing entries for this player
        for (let i = matchmakingQueue.length - 1; i >= 0; i--) {
          const waiter = matchmakingQueue[i];
          if (waiter.ws.readyState !== WebSocket.OPEN || waiter.playerId === participant.playerId) {
            matchmakingQueue.splice(i, 1);
          }
        }

        // Check if there is an opponent waiting in queue
        if (matchmakingQueue.length > 0) {
          const opponent = matchmakingQueue.shift()!;
          const code = generateRoomCode();
          currentRoomCode = code;

          const room: ChallengeRoom = {
            code,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            status: 'playing',
            host: {
              ...opponent.participant,
              ws: opponent.ws,
              isReady: true,
              disconnectedAt: null,
            },
            guest: {
              ...participant,
              ws,
              isReady: true,
              disconnectedAt: null,
            },
            matchState: {
              minute: 0,
              homeScore: 0,
              awayScore: 0,
              status: 'playing',
            },
          };

          rooms.set(code, room);
          console.log(`[WS Relay] Random Match Paired! Room: ${code} between [${opponent.participant.playerName} (${opponent.participant.clubName})] vs [${participant.playerName} (${participant.clubName})]`);

          // Notify Host
          safeSend(opponent.ws, {
            type: 'random_match_matched',
            code,
            role: 'host',
            room: sanitizeRoom(room),
            opponent: sanitizeParticipant(room.guest),
          });

          // Notify Guest
          safeSend(ws, {
            type: 'random_match_matched',
            code,
            role: 'guest',
            room: sanitizeRoom(room),
            opponent: sanitizeParticipant(room.host),
          });
          return;
        }

        // Nobody in queue -> Add to queue
        matchmakingQueue.push({
          ws,
          playerId: participant.playerId,
          participant,
          timestamp: Date.now(),
        });

        console.log(`[WS Relay] Player entered matchmaking queue: ${participant.playerName} (${participant.clubName}). Queue size: ${matchmakingQueue.length}`);

        return safeSend(ws, {
          type: 'matchmaking_searching',
          queueSize: matchmakingQueue.length,
          message: 'جارِ البحث عن منافس أونلاين متاح...',
        });
      }

      // D. CANCEL MATCHMAKING
      if (type === 'cancel_matchmaking') {
        const pId = data.playerId || currentPlayerId;
        const idx = matchmakingQueue.findIndex((q) => q.playerId === pId || q.ws === ws);
        if (idx !== -1) {
          matchmakingQueue.splice(idx, 1);
          console.log(`[WS Relay] Player cancelled matchmaking: ${pId}`);
        }
        return safeSend(ws, { type: 'matchmaking_cancelled' });
      }

      // E. REQUEST BOT MATCH (Solo testing fallback if waiting)
      if (type === 'request_bot_match') {
        const pId = data.playerId || currentPlayerId;
        const idx = matchmakingQueue.findIndex((q) => q.playerId === pId || q.ws === ws);
        if (idx !== -1) matchmakingQueue.splice(idx, 1);

        const { participant } = data;
        if (!participant) return;

        const code = generateRoomCode();
        currentRoomCode = code;
        currentPlayerId = participant.playerId;

        const botClubNames = ['نادي النجوم الدولي', 'أكاديمية الفرسان', 'اتحاد الأبطال', 'نادي الصقور أونلاين', 'كتيبة الأساطير'];
        const botCoachNames = ['كابتن طارق السعيد', 'المدرب حسام البدري', 'كابتن أحمد سامي', 'المدرب إيهاب جلال', 'كابتن علي ماهر'];
        const randomBotClub = botClubNames[Math.floor(Math.random() * botClubNames.length)];
        const randomBotCoach = botCoachNames[Math.floor(Math.random() * botCoachNames.length)];

        const room: ChallengeRoom = {
          code,
          createdAt: Date.now(),
          lastActivity: Date.now(),
          status: 'playing',
          host: {
            ...participant,
            ws,
            isReady: true,
            disconnectedAt: null,
          },
          guest: {
            playerId: 'bot_' + Date.now(),
            playerName: randomBotCoach,
            clubName: randomBotClub,
            clubRating: Math.max(65, Math.min(88, (participant.clubRating || 75) + Math.floor(Math.random() * 7 - 3))),
            tactics: {
              formation: '4-3-3',
              mentality: 'balanced',
              passingStyle: 'mixed',
              pressingIntensity: 'balanced',
              tempo: 'balanced',
            },
            squadSummary: [],
            benchSummary: [],
            ws: null,
            isReady: true,
            disconnectedAt: null,
          },
          matchState: {
            minute: 0,
            homeScore: 0,
            awayScore: 0,
            status: 'playing',
          },
        };

        rooms.set(code, room);

        return safeSend(ws, {
          type: 'random_match_matched',
          code,
          role: 'host',
          room: sanitizeRoom(room),
          opponent: sanitizeParticipant(room.guest),
        });
      }

      // Verify room exists for subsequent room-bound actions
      const code = (data.code || currentRoomCode || '').trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        return safeSend(ws, { type: 'error', message: 'الغرفة غير موجودة' });
      }

      room.lastActivity = Date.now();
      const isHost = room.host.playerId === (data.playerId || currentPlayerId);
      const isGuest = room.guest && room.guest.playerId === (data.playerId || currentPlayerId);

      if (!isHost && !isGuest) {
        return safeSend(ws, { type: 'error', message: 'غير مصرح لك بتنفيذ إجراءات في هذه الغرفة' });
      }

      const opponentWs = isHost ? room.guest?.ws : room.host.ws;

      // 3. RECONNECT
      if (type === 'reconnect') {
        if (isHost) {
          room.host.ws = ws;
          room.host.disconnectedAt = null;
        } else if (room.guest) {
          room.guest.ws = ws;
          room.guest.disconnectedAt = null;
        }

        safeSend(ws, {
          type: 'sync_state',
          room: sanitizeRoom(room),
        });

        safeSend(opponentWs, {
          type: 'player_reconnected',
          playerId: data.playerId,
        });
        return;
      }

      // 4. TOGGLE READY
      if (type === 'toggle_ready') {
        if (isHost) {
          room.host.isReady = !!data.isReady;
        } else if (room.guest) {
          room.guest.isReady = !!data.isReady;
        }

        safeSend(opponentWs, {
          type: 'opponent_ready_changed',
          isReady: data.isReady,
          room: sanitizeRoom(room),
        });
        safeSend(ws, {
          type: 'ready_acknowledged',
          isReady: data.isReady,
        });
        return;
      }

      // 5. UPDATE TACTICS
      if (type === 'update_tactics') {
        if (isHost) {
          room.host.tactics = data.tactics;
        } else if (room.guest) {
          room.guest.tactics = data.tactics;
        }

        safeSend(opponentWs, {
          type: 'opponent_tactics_updated',
          tactics: data.tactics,
        });
        return;
      }

      // 6. START MATCH
      if (type === 'start_match') {
        room.status = 'playing';
        room.matchState = data.initialMatchState || { minute: 0, score: { home: 0, away: 0 } };

        safeSend(room.host.ws, {
          type: 'match_started',
          room: sanitizeRoom(room),
        });
        safeSend(room.guest?.ws, {
          type: 'match_started',
          room: sanitizeRoom(room),
        });
        return;
      }

      // 7. RELAY MATCH TICK / EVENT (Minute by minute live updates)
      if (type === 'match_tick' || type === 'match_event') {
        room.matchState = data.matchState || room.matchState;
        safeSend(opponentWs, {
          ...data,
        });
        return;
      }

      // 8. IN-GAME TACTICS / SUBSTITUTIONS
      if (type === 'in_game_tactics') {
        safeSend(opponentWs, {
          type: 'opponent_in_game_tactics',
          changes: data.changes,
          minute: data.minute,
        });
        return;
      }

      // 9. MATCH END
      if (type === 'match_end') {
        room.status = 'completed';
        room.matchState = data.finalMatchState;

        // Record in in-memory Daily Ranking (RAM only)
        const homeScore = data.finalMatchState?.homeScore ?? room.matchState?.homeScore ?? 0;
        const awayScore = data.finalMatchState?.awayScore ?? room.matchState?.awayScore ?? 0;

        const updatedRanking = recordMatchResultInRAM({
          roomCode: code,
          host: {
            playerId: room.host.playerId,
            playerName: room.host.playerName,
            clubName: room.host.clubName,
            avatar: room.host.avatar,
            clubRating: room.host.clubRating,
          },
          guest: {
            playerId: room.guest?.playerId || 'guest_unknown',
            playerName: room.guest?.playerName || 'المنافس',
            clubName: room.guest?.clubName || 'النادي المنافس',
            avatar: room.guest?.avatar,
            clubRating: room.guest?.clubRating || 70,
          },
          homeScore,
          awayScore,
        });

        safeSend(opponentWs, {
          type: 'match_ended',
          finalMatchState: data.finalMatchState,
        });

        // Broadcast updated top 50 ranking to all connected coaches
        broadcastDailyRanking(wss, updatedRanking);
        return;
      }

      // 10. LEAVE / CLOSE ROOM
      if (type === 'leave_room') {
        safeSend(opponentWs, {
          type: 'opponent_left',
          message: 'غادر المنافس غرفة التحدي.',
        });

        // Delete room immediately from RAM
        console.log(`[WS Relay] Player left, deleting room from RAM: ${code}`);
        rooms.delete(code);
        return;
      }

      // 11. REMATCH REQUEST
      if (type === 'request_rematch') {
        safeSend(opponentWs, {
          type: 'rematch_requested',
        });
        return;
      }

      // 12. ACCEPT REMATCH
      if (type === 'accept_rematch') {
        room.status = 'ready';
        room.matchState = undefined;
        if (room.host) room.host.isReady = false;
        if (room.guest) room.guest.isReady = false;

        safeSend(room.host.ws, { type: 'rematch_accepted', room: sanitizeRoom(room) });
        safeSend(room.guest?.ws, { type: 'rematch_accepted', room: sanitizeRoom(room) });
        return;
      }
    });

    ws.on('close', () => {
      // Remove from matchmaking queue if disconnected
      const qIdx = matchmakingQueue.findIndex((q) => q.ws === ws || (currentPlayerId && q.playerId === currentPlayerId));
      if (qIdx !== -1) {
        matchmakingQueue.splice(qIdx, 1);
      }

      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room) return;

      room.lastActivity = Date.now();
      const isHost = room.host.playerId === currentPlayerId;
      const isGuest = room.guest && room.guest.playerId === currentPlayerId;

      if (isHost) {
        room.host.ws = null;
        room.host.disconnectedAt = Date.now();
        safeSend(room.guest?.ws, {
          type: 'opponent_disconnected',
          timeoutSeconds: 60,
        });
      } else if (isGuest && room.guest) {
        room.guest.ws = null;
        room.guest.disconnectedAt = Date.now();
        safeSend(room.host.ws, {
          type: 'opponent_disconnected',
          timeoutSeconds: 60,
        });
      }

      // If room was just in 'waiting' status and host left, delete immediately
      if (isHost && room.status === 'waiting') {
        console.log(`[WS Relay] Host disconnected from empty room, purging: ${currentRoomCode}`);
        rooms.delete(currentRoomCode);
      }
    });

    ws.on('error', (err: any) => {
      console.warn('[WS Relay] Socket error:', err.message);
    });
  });

  return wss;
}
