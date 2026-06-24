const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const buildWebSocketUrl = (movieId) => {
  const base = new URL(API_BASE_URL, window.location.origin);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  base.pathname = '/ws';
  base.search = '';
  const token = localStorage.getItem('cinema_token');
  if (token) base.searchParams.set('token', token);
  if (movieId) base.searchParams.set('movieId', movieId);
  return base.toString();
};

export const connectRealtime = ({ movieId, onEvent, onStatus }) => {
  let socket;
  let reconnectTimer;
  let stopped = false;
  let attempts = 0;

  const connect = () => {
    if (stopped) return;
    socket = new WebSocket(buildWebSocketUrl(movieId));
    onStatus?.('connecting');
    socket.onopen = () => { attempts = 0; onStatus?.('connected'); };
    socket.onmessage = (message) => {
      try { onEvent?.(JSON.parse(message.data)); } catch { /* Ignore malformed events. */ }
    };
    socket.onerror = () => onStatus?.('error');
    socket.onclose = () => {
      onStatus?.('disconnected');
      if (!stopped) {
        attempts += 1;
        reconnectTimer = window.setTimeout(connect, Math.min(1000 * (2 ** attempts), 15000));
      }
    };
  };

  connect();
  return () => {
    stopped = true;
    window.clearTimeout(reconnectTimer);
    socket?.close();
  };
};

export const connectMatchChat = ({ matchId, onEvent, onStatus }) => {
  let socket;
  let reconnectTimer;
  let stopped = false;
  let attempts = 0;

  const connect = () => {
    if (stopped) return;
    socket = new WebSocket(buildWebSocketUrl());
    onStatus?.('connecting');
    socket.onopen = () => {
      attempts = 0;
      socket.send(JSON.stringify({ type: 'MATCH_SUBSCRIBE', data: { matchId } }));
      onStatus?.('connected');
    };
    socket.onmessage = (message) => {
      try { onEvent?.(JSON.parse(message.data)); } catch { /* Ignore malformed events. */ }
    };
    socket.onerror = () => onStatus?.('error');
    socket.onclose = () => {
      onStatus?.('disconnected');
      if (!stopped) {
        attempts += 1;
        reconnectTimer = window.setTimeout(connect, Math.min(1000 * (2 ** attempts), 15000));
      }
    };
  };

  connect();
  return {
    sendMessage: (matchId, content) => {
      if (socket?.readyState !== WebSocket.OPEN) return false;
      socket.send(JSON.stringify({
        type: 'MATCH_SEND_MESSAGE',
        data: { matchId, content, clientMessageId: crypto.randomUUID() },
      }));
      return true;
    },
    disconnect: () => {
      stopped = true;
      window.clearTimeout(reconnectTimer);
      socket?.close();
    },
  };
};
