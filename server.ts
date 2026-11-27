import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'fps-booster-pro-120',
      wsPingPath: '/ws/ping',
      timestamp: Date.now(),
    });
  });

  const server = http.createServer(app);

  // Dedicated WebSocket local gaming ping server on /ws/ping
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'welcome',
          serverName: 'Local Gaming Server',
          protocol: 'ws-ping-v1',
          serverTs: Date.now(),
        })
      );
    }

    ws.on('message', (rawData) => {
      const receivedAt = Date.now();
      const text = rawData.toString();

      try {
        const parsed = JSON.parse(text);
        if (parsed && parsed.type === 'ping') {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'pong',
                seq: parsed.seq ?? 0,
                clientTs: parsed.clientTs ?? receivedAt,
                serverTs: receivedAt,
                serverName: 'Local Gaming Server',
              })
            );
          }
          return;
        }
      } catch {
        // Non-JSON ping probe
      }

      if (text.trim().toLowerCase() === 'ping' && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'pong',
            seq: 0,
            clientTs: receivedAt,
            serverTs: receivedAt,
            serverName: 'Local Gaming Server',
          })
        );
      }
    });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.on('upgrade', (request, socket, head) => {
    const rawUrl = request.url || '/';
    const pathname = rawUrl.split('?')[0];
    if (pathname === '/ws/ping') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else if (isProduction) {
      socket.destroy();
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`FPS Booster server listening on http://0.0.0.0:${PORT} (WS /ws/ping ready)`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
