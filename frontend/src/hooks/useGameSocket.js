import { useEffect, useRef } from 'react';

const WS_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('https://', 'wss://').replace('http://', 'ws://')
  : 'ws://localhost:3001';

export function useGameSocket(gameId, handlers) {
  const wsRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!gameId) return;

    function connect() {
      const ws = new WebSocket(`${WS_URL}?game_id=${gameId}`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          const handler = handlersRef.current[event.type];
          if (handler) handler(event);
        } catch {}
      };

      ws.onclose = () => {
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [gameId]);
}