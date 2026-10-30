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

  // Parse CLI args (--port and --host) or fallback to env / 3000
  const portArgIdx = process.argv.indexOf('--port');
  const cliPort = portArgIdx !== -1 && process.argv[portArgIdx + 1] ? parseInt(process.argv[portArgIdx + 1], 10) : undefined;
  const PORT = Number.isFinite(cliPort) && (cliPort as number) > 0 ? (cliPort as number) : (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

  const hostArgIdx = process.argv.indexOf('--host');
  const cliHost = hostArgIdx !== -1 && process.argv[hostArgIdx + 1] ? process.argv[hostArgIdx + 1] : undefined;
  const HOST = cliHost || process.env.HOST || '0.0.0.0';

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
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
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

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${PORT} is currently in use. Exiting cleanly to allow supervisor restart.`);
      process.exit(1);
    } else {
      console.error('[Server] HTTP Server error:', err);
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`[Server] Live on http://${HOST}:${PORT} - WebSocket Relay on /ws/challenge`);
  });

  const cleanup = () => {
    console.log('[Server] Received termination signal, closing server gracefully...');
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}

startServer().catch((err) => {
  console.error('[Server] Fatal error during startServer:', err);
  process.exit(1);
});
