import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/features/auth/stores/authStore';

let socket: Socket | null = null;
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 30000;

export const connect = () => {
  if (socket?.connected) return;

  const token = useAuthStore.getState().accessToken;
  if (!token) return;

  const rootUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '') : '/';
  socket = io(rootUrl, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: reconnectDelay,
    reconnectionDelayMax: MAX_RECONNECT_DELAY,
    randomizationFactor: 0.5,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    reconnectDelay = 1000; // Reset delay on success
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.io.on('reconnect_attempt', (attempt) => {
    console.log(`Socket reconnect attempt ${attempt}`);
    socket!.io.opts.reconnectionDelay = reconnectDelay;
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
  });
};

export const disconnect = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
