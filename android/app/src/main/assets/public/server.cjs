var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");

// server/challengeRelay.ts
var import_ws = require("ws");
var rooms = /* @__PURE__ */ new Map();
var CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function generateRoomCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}
function safeSend(ws, data) {
  if (ws && ws.readyState === import_ws.WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch (err) {
      console.warn("[WS Relay] Failed to send message:", err);
    }
  }
}
function sanitizeParticipant(p) {
  if (!p) return null;
  const { ws, ...rest } = p;
  return {
    ...rest,
    isConnected: ws !== null && ws.readyState === import_ws.WebSocket.OPEN
  };
}
function sanitizeRoom(room) {
  return {
    code: room.code,
    status: room.status,
    createdAt: room.createdAt,
    host: sanitizeParticipant(room.host),
    guest: sanitizeParticipant(room.guest),
    matchState: room.matchState
  };
}
function setupChallengeWebSocketServer(server) {
  const wss = new import_ws.WebSocketServer({
    server,
    path: "/ws/challenge"
  });
  console.log("[WS Relay] Online Challenge WebSocket Relay mounted on /ws/challenge");
  const pingInterval = setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.isAlive === false) {
        return client.terminate();
      }
      client.isAlive = false;
      try {
        client.ping();
      } catch {
      }
    });
  }, 3e4);
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms.entries()) {
      if (now - room.lastActivity > 30 * 60 * 1e3) {
        console.log(`[WS Relay] Purging inactive room from RAM: ${code}`);
        rooms.delete(code);
        continue;
      }
      const hostDead = room.host.disconnectedAt && now - room.host.disconnectedAt > 9e4;
      const guestDead = !room.guest || room.guest.disconnectedAt && now - room.guest.disconnectedAt > 9e4;
      if (hostDead && guestDead) {
        console.log(`[WS Relay] Purging abandoned room from RAM: ${code}`);
        rooms.delete(code);
      }
    }
  }, 15e3);
  wss.on("close", () => {
    clearInterval(pingInterval);
    clearInterval(cleanupInterval);
  });
  wss.on("connection", (ws) => {
    ws.isAlive = true;
    let currentRoomCode = null;
    let currentPlayerId = null;
    ws.on("pong", () => {
      ws.isAlive = true;
    });
    ws.on("message", (messageRaw) => {
      let data;
      try {
        data = JSON.parse(messageRaw.toString());
      } catch {
        return safeSend(ws, { type: "error", message: "\u062A\u0646\u0633\u064A\u0642 \u0631\u0633\u0627\u0644\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D" });
      }
      const { type } = data;
      if (type === "create_room") {
        const { playerId, playerName, clubName, clubRating, tactics, squadSummary } = data;
        if (!playerId || !playerName || !clubName) {
          return safeSend(ws, { type: "error", message: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062F\u0631\u0628 \u0648\u0627\u0644\u0646\u0627\u062F\u064A \u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062A\u062D\u062F\u064A" });
        }
        const code2 = generateRoomCode();
        currentRoomCode = code2;
        currentPlayerId = playerId;
        const room2 = {
          code: code2,
          createdAt: Date.now(),
          lastActivity: Date.now(),
          status: "waiting",
          host: {
            playerId,
            playerName,
            clubName,
            clubRating: clubRating || 70,
            tactics: tactics || {},
            squadSummary: squadSummary || [],
            ws,
            isReady: false,
            disconnectedAt: null
          }
        };
        rooms.set(code2, room2);
        console.log(`[WS Relay] Room created in RAM: ${code2} by ${playerName} (${clubName})`);
        return safeSend(ws, {
          type: "room_created",
          code: code2,
          role: "host",
          room: sanitizeRoom(room2)
        });
      }
      if (type === "join_room") {
        const rawCode = (data.code || "").trim().toUpperCase();
        const { playerId, playerName, clubName, clubRating, tactics, squadSummary } = data;
        if (!rawCode) {
          return safeSend(ws, { type: "error", message: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0643\u0648\u062F \u0627\u0644\u063A\u0631\u0641\u0629" });
        }
        const room2 = rooms.get(rawCode);
        if (!room2) {
          return safeSend(ws, { type: "error", message: "\u0643\u0648\u062F \u0627\u0644\u063A\u0631\u0641\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u062A\u0647" });
        }
        room2.lastActivity = Date.now();
        if (room2.host.playerId === playerId) {
          room2.host.ws = ws;
          room2.host.disconnectedAt = null;
          currentRoomCode = rawCode;
          currentPlayerId = playerId;
          return safeSend(ws, {
            type: "room_joined",
            code: rawCode,
            role: "host",
            room: sanitizeRoom(room2)
          });
        }
        if (room2.guest && room2.guest.playerId === playerId) {
          room2.guest.ws = ws;
          room2.guest.disconnectedAt = null;
          currentRoomCode = rawCode;
          currentPlayerId = playerId;
          return safeSend(ws, {
            type: "room_joined",
            code: rawCode,
            role: "guest",
            room: sanitizeRoom(room2)
          });
        }
        if (room2.guest && room2.guest.ws && room2.guest.ws.readyState === import_ws.WebSocket.OPEN) {
          return safeSend(ws, { type: "error", message: "\u063A\u0631\u0641\u0629 \u0627\u0644\u062A\u062D\u062F\u064A \u0645\u0645\u062A\u0644\u0626\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644" });
        }
        room2.guest = {
          playerId,
          playerName,
          clubName,
          clubRating: clubRating || 70,
          tactics: tactics || {},
          squadSummary: squadSummary || [],
          ws,
          isReady: false,
          disconnectedAt: null
        };
        room2.status = "ready";
        currentRoomCode = rawCode;
        currentPlayerId = playerId;
        console.log(`[WS Relay] Guest joined room: ${rawCode} (${playerName})`);
        safeSend(ws, {
          type: "room_joined",
          code: rawCode,
          role: "guest",
          room: sanitizeRoom(room2)
        });
        safeSend(room2.host.ws, {
          type: "opponent_joined",
          guest: sanitizeParticipant(room2.guest),
          room: sanitizeRoom(room2)
        });
        return;
      }
      const code = (data.code || currentRoomCode || "").trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        return safeSend(ws, { type: "error", message: "\u0627\u0644\u063A\u0631\u0641\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      }
      room.lastActivity = Date.now();
      const isHost = room.host.playerId === (data.playerId || currentPlayerId);
      const isGuest = room.guest && room.guest.playerId === (data.playerId || currentPlayerId);
      if (!isHost && !isGuest) {
        return safeSend(ws, { type: "error", message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u0646\u0641\u064A\u0630 \u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u063A\u0631\u0641\u0629" });
      }
      const opponentWs = isHost ? room.guest?.ws : room.host.ws;
      if (type === "reconnect") {
        if (isHost) {
          room.host.ws = ws;
          room.host.disconnectedAt = null;
        } else if (room.guest) {
          room.guest.ws = ws;
          room.guest.disconnectedAt = null;
        }
        safeSend(ws, {
          type: "sync_state",
          room: sanitizeRoom(room)
        });
        safeSend(opponentWs, {
          type: "player_reconnected",
          playerId: data.playerId
        });
        return;
      }
      if (type === "toggle_ready") {
        if (isHost) {
          room.host.isReady = !!data.isReady;
        } else if (room.guest) {
          room.guest.isReady = !!data.isReady;
        }
        safeSend(opponentWs, {
          type: "opponent_ready_changed",
          isReady: data.isReady,
          room: sanitizeRoom(room)
        });
        safeSend(ws, {
          type: "ready_acknowledged",
          isReady: data.isReady
        });
        return;
      }
      if (type === "update_tactics") {
        if (isHost) {
          room.host.tactics = data.tactics;
        } else if (room.guest) {
          room.guest.tactics = data.tactics;
        }
        safeSend(opponentWs, {
          type: "opponent_tactics_updated",
          tactics: data.tactics
        });
        return;
      }
      if (type === "start_match") {
        room.status = "playing";
        room.matchState = data.initialMatchState || { minute: 0, score: { home: 0, away: 0 } };
        safeSend(room.host.ws, {
          type: "match_started",
          room: sanitizeRoom(room)
        });
        safeSend(room.guest?.ws, {
          type: "match_started",
          room: sanitizeRoom(room)
        });
        return;
      }
      if (type === "match_tick" || type === "match_event") {
        room.matchState = data.matchState || room.matchState;
        safeSend(opponentWs, {
          ...data
        });
        return;
      }
      if (type === "in_game_tactics") {
        safeSend(opponentWs, {
          type: "opponent_in_game_tactics",
          changes: data.changes,
          minute: data.minute
        });
        return;
      }
      if (type === "match_end") {
        room.status = "completed";
        room.matchState = data.finalMatchState;
        safeSend(opponentWs, {
          type: "match_ended",
          finalMatchState: data.finalMatchState
        });
        return;
      }
      if (type === "leave_room") {
        safeSend(opponentWs, {
          type: "opponent_left",
          message: "\u063A\u0627\u062F\u0631 \u0627\u0644\u0645\u0646\u0627\u0641\u0633 \u063A\u0631\u0641\u0629 \u0627\u0644\u062A\u062D\u062F\u064A."
        });
        console.log(`[WS Relay] Player left, deleting room from RAM: ${code}`);
        rooms.delete(code);
        return;
      }
      if (type === "request_rematch") {
        safeSend(opponentWs, {
          type: "rematch_requested"
        });
        return;
      }
      if (type === "accept_rematch") {
        room.status = "ready";
        room.matchState = void 0;
        if (room.host) room.host.isReady = false;
        if (room.guest) room.guest.isReady = false;
        safeSend(room.host.ws, { type: "rematch_accepted", room: sanitizeRoom(room) });
        safeSend(room.guest?.ws, { type: "rematch_accepted", room: sanitizeRoom(room) });
        return;
      }
    });
    ws.on("close", () => {
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
          type: "opponent_disconnected",
          timeoutSeconds: 60
        });
      } else if (isGuest && room.guest) {
        room.guest.ws = null;
        room.guest.disconnectedAt = Date.now();
        safeSend(room.host.ws, {
          type: "opponent_disconnected",
          timeoutSeconds: 60
        });
      }
      if (isHost && room.status === "waiting") {
        console.log(`[WS Relay] Host disconnected from empty room, purging: ${currentRoomCode}`);
        rooms.delete(currentRoomCode);
      }
    });
    ws.on("error", (err) => {
      console.warn("[WS Relay] Socket error:", err.message);
    });
  });
  return wss;
}

// server.ts
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  const server = import_http.default.createServer(app);
  setupChallengeWebSocketServer(server);
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: Date.now() });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Live on http://0.0.0.0:${PORT} - WebSocket Relay on /ws/challenge`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
