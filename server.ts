import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  setupChallengeWebSocketServer,
  getTop50DailyRanking,
  getTodayDateKey,
  recordMatchResultInRAM,
} from './server/challengeRelay';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  app.use(express.json());

  // Setup Live WebSocket Relay for Online Challenges (Pure RAM Relay, Zero Database)
  setupChallengeWebSocketServer(server);

  // Health and API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  // Daily Coach Ranking Endpoint (In-Memory RAM Only, Top 50, Resets daily)
  app.get('/api/pvp/daily-ranking', (req, res) => {
    res.json({
      success: true,
      date: getTodayDateKey(),
      ranking: getTop50DailyRanking(),
    });
  });

  // Record completed match result into in-memory ranking
  app.post('/api/pvp/record-result', (req, res) => {
    const result = req.body;
    if (!result || !result.host || !result.guest) {
      return res.status(400).json({ success: false, error: 'بيانات نتيجة المباراة غير مكتملة' });
    }
    const updatedRanking = recordMatchResultInRAM(result);
    res.json({ success: true, ranking: updatedRanking });
  });

  // Vite middleware in development, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Live on http://0.0.0.0:${PORT} - WebSocket Relay on /ws/challenge`);
  });
}

startServer();
