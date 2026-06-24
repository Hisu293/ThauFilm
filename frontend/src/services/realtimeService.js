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

const sharedRealtimeConnections = new Map();

const createSharedConnection = (movieId) => {
  const connection = {
    movieId,
    socket: null,
    reconnectTimer: null,
    closeTimer: null,
    attempts: 0,
    listeners: new Set(),
    statusListeners: new Set(),
  };

  const emitStatus = (status) => connection.statusListeners.forEach((listener) => listener?.(status));
  const connect = () => {
    if (connection.listeners.size === 0 || connection.socket?.readyState === WebSocket.CONNECTING || connection.socket?.readyState === WebSocket.OPEN) return;
    const socket = new WebSocket(buildWebSocketUrl(movieId));
    connection.socket = socket;
    emitStatus('connecting');
    socket.onopen = () => { connection.attempts = 0; emitStatus('connected'); };
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data);
        connection.listeners.forEach((listener) => listener?.(event));
      } catch { /* Ignore malformed events. */ }
    };
    socket.onerror = () => emitStatus('error');
    socket.onclose = () => {
      if (connection.socket === socket) connection.socket = null;
      emitStatus('disconnected');
      if (connection.listeners.size > 0) {
        connection.attempts += 1;
        connection.reconnectTimer = window.setTimeout(connect, Math.min(1000 * (2 ** connection.attempts), 15000));
      }
    };
  };
  connection.connect = connect;
  return connection;
};

export const connectRealtime = ({ movieId, onEvent, onStatus }) => {
  const key = movieId ? `movie:${movieId}` : 'authenticated-user';
  const connection = sharedRealtimeConnections.get(key) || createSharedConnection(movieId);
  sharedRealtimeConnections.set(key, connection);
  window.clearTimeout(connection.closeTimer);
  connection.listeners.add(onEvent);
  if (onStatus) connection.statusListeners.add(onStatus);
  connection.reconnectTimer = window.setTimeout(connection.connect, 0);

  return () => {
    connection.listeners.delete(onEvent);
    if (onStatus) connection.statusListeners.delete(onStatus);
    window.clearTimeout(connection.reconnectTimer);
    // Grace period prevents React StrictMode's test unmount from closing a
    // WebSocket while its handshake is still in progress.
    connection.closeTimer = window.setTimeout(() => {
      if (connection.listeners.size > 0) return;
      connection.socket?.close();
      connection.socket = null;
      sharedRealtimeConnections.delete(key);
    }, 300);
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

  reconnectTimer = window.setTimeout(connect, 0);
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

export const connectGroupBooking = ({ groupId, onEvent, onStatus }) => {
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
      socket.send(JSON.stringify({ type: 'GROUP_SUBSCRIBE', data: { groupId } }));
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

  reconnectTimer = window.setTimeout(connect, 0);
  return {
    toggleSeat: (seatId) => {
      if (socket?.readyState !== WebSocket.OPEN) return false;
      socket.send(JSON.stringify({ type: 'GROUP_SEAT_TOGGLE', data: { groupId, seatId } }));
      return true;
    },
    disconnect: () => {
      stopped = true;
      window.clearTimeout(reconnectTimer);
      socket?.close();
    },
  };
};
