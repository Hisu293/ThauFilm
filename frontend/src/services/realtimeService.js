import { clearAuthStorage, getAccessToken } from '../utils/authStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const buildWebSocketUrl = (movieId) => {
  const base = new URL(API_BASE_URL, window.location.origin);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  base.pathname = '/ws';
  base.search = '';
  const token = getAccessToken();
  console.debug('[WS] Tạo URL WebSocket - có token:', !!token, token ? `(${token.substring(0, 20)}...)` : '');
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
    console.debug('[WS] Đang kết nối tới:', url.replace(/token=[^&]+/, 'token=***'));
    const socket = new WebSocket(url);
    connection.socket = socket;
    let opened = false;
    emitStatus('connecting');
    socket.onopen = () => {
      opened = true;
      console.info('[WS] Kết nối thành công');
      connection.attempts = 0;
      emitStatus('connected');
    };
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data);
        console.debug('[WS] Đã nhận sự kiện:', event.type);
        connection.listeners.forEach((listener) => listener?.(event));
      } catch (e) {
        console.warn('[WS] Không thể phân tích tin nhắn:', e);
      }
    };
    socket.onerror = (error) => {
      console.error('[WS] Lỗi kết nối:', error);
      emitStatus('error');
    };
    socket.onclose = (event) => {
      console.info('[WS] Kết nối đã đóng, mã:', event.code, 'lý do:', event.reason);
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
        console.info('[WS] Sẽ kết nối lại sau', delay, 'ms, lần thử:', connection.attempts);
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
    console.debug('[WS Trận đấu] Đang kết nối tới:', url.replace(/token=[^&]+/, 'token=***'));
    socket = new WebSocket(url);
    let opened = false;
    onStatus?.('connecting');
    socket.onopen = () => {
      opened = true;
      console.info('[WS Trận đấu] Đã kết nối, đang đăng ký theo dõi trận đấu:', matchId);
      attempts = 0;
      socket.send(JSON.stringify({ type: 'MATCH_SUBSCRIBE', data: { matchId } }));
      onStatus?.('connected');
    };
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data);
        console.debug('[WS Trận đấu] Đã nhận sự kiện:', event.type);
        onEvent?.(event);
      } catch (e) {
        console.warn('[WS Trận đấu] Không thể phân tích tin nhắn:', e);
      }
    };
    socket.onerror = (error) => {
      console.error('[WS Trận đấu] Lỗi kết nối:', error);
      onStatus?.('error');
    };
    socket.onclose = (event) => {
      console.info('[WS Trận đấu] Kết nối đã đóng, mã:', event.code);
      onStatus?.('disconnected');
      if (!opened && getAccessToken()) {
        clearAuthStorage();
        onStatus?.('invalid-token');
        return;
      }
      if (!stopped) {
        attempts += 1;
        const delay = Math.min(1000 * (2 ** attempts), 15000);
        console.info('[WS Trận đấu] Sẽ kết nối lại sau', delay, 'ms');
        reconnectTimer = window.setTimeout(connect, delay);
      }
    };
  };

  reconnectTimer = window.setTimeout(connect, 0);
  return {
    sendMessage: (matchId, content) => {
      if (socket?.readyState !== WebSocket.OPEN) {
        console.warn('[WS Trận đấu] Không thể gửi vì socket chưa mở:', socket?.readyState);
        return false;
      }
      console.debug('[WS Trận đấu] Đang gửi tin nhắn tới trận đấu:', matchId);
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
    console.debug('[WS Nhóm] Đang kết nối tới:', url.replace(/token=[^&]+/, 'token=***'));
    socket = new WebSocket(url);
    let opened = false;
    onStatus?.('connecting');
    socket.onopen = () => {
      opened = true;
      console.info('[WS Nhóm] Đã kết nối, đang đăng ký theo dõi nhóm:', groupId);
      attempts = 0;
      socket.send(JSON.stringify({ type: 'GROUP_SUBSCRIBE', data: { groupId } }));
      onStatus?.('connected');
    };
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data);
        console.debug('[WS Nhóm] Đã nhận sự kiện:', event.type);
        onEvent?.(event);
      } catch (e) {
        console.warn('[WS Nhóm] Không thể phân tích tin nhắn:', e);
      }
    };
    socket.onerror = (error) => {
      console.error('[WS Nhóm] Lỗi kết nối:', error);
      onStatus?.('error');
    };
    socket.onclose = (event) => {
      console.info('[WS Nhóm] Kết nối đã đóng, mã:', event.code);
      onStatus?.('disconnected');
      if (!opened && getAccessToken()) {
        clearAuthStorage();
        onStatus?.('invalid-token');
        return;
      }
      if (!stopped) {
        attempts += 1;
        const delay = Math.min(1000 * (2 ** attempts), 15000);
        console.info('[WS Nhóm] Sẽ kết nối lại sau', delay, 'ms');
        reconnectTimer = window.setTimeout(connect, delay);
      }
    };
  };

  reconnectTimer = window.setTimeout(connect, 0);
  return {
    toggleSeat: (seatId) => {
      if (socket?.readyState !== WebSocket.OPEN) {
        console.warn('[WS Nhóm] Không thể đổi trạng thái vì socket chưa mở:', socket?.readyState);
        return false;
      }
      console.debug('[WS Nhóm] Đang đổi trạng thái ghế:', seatId);
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

export const connectWatchParty = ({ roomId, onEvent, onStatus }) => {
  let socket;
  let reconnectTimer;
  let stopped = false;
  let attempts = 0;

  const sendPayload = (payload) => {
    if (socket?.readyState !== WebSocket.OPEN) {
      console.warn('[WS Xem chung] Không thể gửi vì socket chưa mở:', socket?.readyState);
      return false;
    }
    socket.send(JSON.stringify(payload));
    return true;
  };

  const connect = () => {
    if (stopped) return;
    const url = buildWebSocketUrl();
    console.debug('[WS Xem chung] Đang kết nối tới:', url.replace(/token=[^&]+/, 'token=***'));
    socket = new WebSocket(url);
    let opened = false;
    onStatus?.('connecting');
    socket.onopen = () => {
      opened = true;
      attempts = 0;
      socket.send(JSON.stringify({ type: 'WATCH_PARTY_SUBSCRIBE', data: { roomId } }));
      onStatus?.('connected');
    };
    socket.onmessage = (message) => {
      try {
        onEvent?.(JSON.parse(message.data));
      } catch (e) {
        console.warn('[WS Xem chung] Không thể phân tích tin nhắn:', e);
      }
    };
    socket.onerror = () => onStatus?.('error');
    socket.onclose = () => {
      onStatus?.('disconnected');
      if (!opened && getAccessToken()) {
        clearAuthStorage();
        onStatus?.('invalid-token');
        return;
      }
      if (!stopped) {
        attempts += 1;
        reconnectTimer = window.setTimeout(connect, Math.min(1000 * (2 ** attempts), 15000));
      }
    };
  };

  reconnectTimer = window.setTimeout(connect, 0);
  return {
    syncPlayback: ({ currentTime, paused }) => sendPayload({
      type: 'WATCH_PARTY_PLAYBACK',
      data: { roomId, currentTime, paused },
    }),
    sendMessage: (content) => sendPayload({
      type: 'WATCH_PARTY_CHAT',
      data: { roomId, content },
    }),
    sendReaction: (reaction) => sendPayload({
      type: 'WATCH_PARTY_REACTION',
      data: { roomId, reaction },
    }),
    disconnect: () => {
      stopped = true;
      window.clearTimeout(reconnectTimer);
      socket?.close();
    },
  };
};
