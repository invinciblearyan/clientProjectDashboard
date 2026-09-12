import type { SocketUser } from '../websocket/types';

declare module 'socket.io' {
  interface SocketData {
    user: SocketUser;
  }
}

export {};
