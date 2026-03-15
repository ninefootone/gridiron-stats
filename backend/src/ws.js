const { WebSocketServer } = require('ws');

// Map of game_id -> Set of connected clients
const gameClients = new Map();

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const gameId = url.searchParams.get('game_id');

    if (!gameId) {
      ws.close();
      return;
    }

    if (!gameClients.has(gameId)) {
      gameClients.set(gameId, new Set());
    }
    gameClients.get(gameId).add(ws);

    ws.on('close', () => {
      const clients = gameClients.get(gameId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) gameClients.delete(gameId);
      }
    });

    ws.on('error', () => ws.close());

    // Send a connected confirmation
    ws.send(JSON.stringify({ type: 'connected', game_id: gameId }));
  });

  return wss;
}

function broadcast(gameId, event) {
  const clients = gameClients.get(String(gameId));
  if (!clients) return;
  const message = JSON.stringify(event);
  clients.forEach(ws => {
    if (ws.readyState === 1) ws.send(message);
  });
}

module.exports = { setupWebSocket, broadcast };