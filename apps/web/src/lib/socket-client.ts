import { io } from 'socket.io-client';

import { useAuthStore } from '../stores/auth-store';

import type { ClientToServerEvents, ServerToClientEvents } from '@nexops/shared';
import type { Socket } from 'socket.io-client';

export type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';
let socket: RealtimeSocket | undefined;

export function getRealtimeSocket(): RealtimeSocket {
  socket ??= io(socketUrl, {
    autoConnect: false,
    transports: ['websocket'],
    withCredentials: true,
    auth: (done) => done({ token: useAuthStore.getState().accessToken }),
  });
  return socket;
}
