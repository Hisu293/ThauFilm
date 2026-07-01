import { clearAuthStorage, getAccessToken } from '../utils/authStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const buildWebSocketUrl = (movieId) => {
  const base = new URL(API_BASE_URL, window.location.origin);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  base.pathname = '/ws';
  base.search = '';
  const token = getAccessToken();
  console.debug('[WS] buildWebSocketUrl - token exists:', !!token, token ? `(${token.substring(0, 20)}...)` : '');
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
    const url = buildWebSocketUrl(movieId);
    console.debug('[WS] Connecting to:', url.replace(/token=[^&]+/, 'token=***'));
    const socket = new WebSocket(url);
    connection.socket = socket;
    let opened = false;
    emitStatus('connecting');
    socket.onopen = () => {
      opened = true;
      console.info('[WS] Connected successfully');
      connection.attempts = 0;
      emitStatus('connected');
    };
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data);
        console.debug('[WS] Received event:', event.type);
        connection.listeners.forEach((listener) => listener?.(event));
      } catch (e) {
        console.warn('[WS] Failed to parse message:', e);
      }
    };
    socket.onerror = (error) => {
      console.error('[WS] Connection error:', error);
      emitStatus('error');
    };
    socket.onclose = (event) => {
      console.info('[WS] Connection closed, code:', event.code, 'reason:', event.reason);
      if (connection.socket === socket) connection.socket = null;
      emitStatus('disconnected');
      if (!opened && getAccessToken() && !movieId) {
        clearAuthStorage();
        emitStatus('invalid-token');
        return;
      }
      if (connection.listeners.size > 0) {
        connection.attempts += 1;
        const delay = Math.min(1000 * (2 ** connection.attempts), 15000);
        console.info('[WS] Reconnecting in', delay, 'ms, attempt:', connection.attempts);
        connection.reconnectTimer = window.setTimeout(connect, delay);
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
    const url = buildWebSocketUrl();
    console.debug('[WS Match] Connecting to:', url.replace(/token=[^&]+/, 'token=***'));
    socket = new WebSocket(url);
    let opened = false;
    onStatus?.('connecting');
    socket.onopen = () => {
      opened = true;
      console.info('[WS Match] Connected, subscribing to match:', matchId);
      attempts = 0;
      socket.send(JSON.stringify({ type: 'MATCH_SUBSCRIBE', data: { matchId } }));
      onStatus?.('connected');
    };
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data);
        console.debug('[WS Match] Received event:', event.type);
        onEvent?.(event);
      } catch (e) {
        console.warn('[WS Match] Failed to parse message:', e);
      }
    };
    socket.onerror = (error) => {
      console.error('[WS Match] Connection error:', error);
      onStatus?.('error');
    };
    socket.onclose = (event) => {
      console.info('[WS Match] Connection closed, code:', event.code);
      onStatus?.('disconnected');
      if (!opened && getAccessToken()) {
        clearAuthStorage();
        onStatus?.('invalid-token');
        return;
      }
      if (!stopped) {
        attempts += 1;
        const delay = Math.min(1000 * (2 ** attempts), 15000);
        console.info('[WS Match] Reconnecting in', delay, 'ms');
        reconnectTimer = window.setTimeout(connect, delay);
      }
    };
  };

  reconnectTimer = window.setTimeout(connect, 0);
  return {
    sendMessage: (matchId, content) => {
      if (socket?.readyState !== WebSocket.OPEN) {
        console.warn('[WS Match] Cannot send, socket not open:', socket?.readyState);
        return false;
      }
      console.debug('[WS Match] Sending message to match:', matchId);
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
    const url = buildWebSocketUrl();
    console.debug('[WS Group] Connecting to:', url.replace(/token=[^&]+/, 'token=***'));
    socket = new WebSocket(url);
    let opened = false;
    onStatus?.('connecting');
    socket.onopen = () => {
      opened = true;
      console.info('[WS Group] Connected, subscribing to group:', groupId);
      attempts = 0;
      socket.send(JSON.stringify({ type: 'GROUP_SUBSCRIBE', data: { groupId } }));
      onStatus?.('connected');
    };
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data);
        console.debug('[WS Group] Received event:', event.type);
        onEvent?.(event);
      } catch (e) {
        console.warn('[WS Group] Failed to parse message:', e);
      }
    };
    socket.onerror = (error) => {
      console.error('[WS Group] Connection error:', error);
      onStatus?.('error');
    };
    socket.onclose = (event) => {
      console.info('[WS Group] Connection closed, code:', event.code);
      onStatus?.('disconnected');
      if (!opened && getAccessToken()) {
        clearAuthStorage();
        onStatus?.('invalid-token');
        return;
      }
      if (!stopped) {
        attempts += 1;
        const delay = Math.min(1000 * (2 ** attempts), 15000);
        console.info('[WS Group] Reconnecting in', delay, 'ms');
        reconnectTimer = window.setTimeout(connect, delay);
      }
    };
  };

  reconnectTimer = window.setTimeout(connect, 0);
  return {
    toggleSeat: (seatId) => {
      if (socket?.readyState !== WebSocket.OPEN) {
        console.warn('[WS Group] Cannot toggle, socket not open:', socket?.readyState);
        return false;
      }
      console.debug('[WS Group] Toggling seat:', seatId);
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
