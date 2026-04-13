import { useEffect, useRef, useState } from 'react';

const WHISTLE_HOST = 'www.whistle-app.co';

export function useWhistleSocket(whistleGameId) {
  const [whistleState, setWhistleState] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectRef = useRef(0);

  useEffect(() => {
    if (!whistleGameId) {
      setWhistleState(null);
      setConnected(false);
      return;
    }

    function connect() {
      const ws = new WebSocket(`wss://${WHISTLE_HOST}/game/${whistleGameId}?role=5hd74h`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectRef.current = 0;
        ws.send(JSON.stringify({ type: 'REQUEST_STATE' }));
      };

      ws.onmessage = (e) => {
        try {
          const message = JSON.parse(e.data);
          setWhistleState(prev => ({ ...(prev || {}), ...message }));
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        if (reconnectRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectRef.current), 15000);
          reconnectRef.current++;
          setTimeout(connect, delay);
        }
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
  }, [whistleGameId]);

  return { whistleState, connected };
}