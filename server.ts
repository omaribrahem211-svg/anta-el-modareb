import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { setupChallengeWebSocketServer } from './server/challengeRelay';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  // Setup Live WebSocket Relay for Online Challenges (Pure RAM Relay, Zero Database)
  setupChallengeWebSocketServer(server);

  // Health and API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: Date.now() });
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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Live on http://0.0.0.0:${PORT} - WebSocket Relay on /ws/challenge`);
  });
}

startServer();
