import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { socketAuthMiddleware } from './auth.middleware';
import { WebSocketEventEmitter, setWebSocketEmitter } from './event.emitter';
import { sendActivityCatchup } from './handlers/catchup.handler';
import { registerPresenceHandlers } from './handlers/presence.handler';
import { presenceTracker } from './presence.tracker';
import { ADMIN_PRESENCE_ROOM, SOCKET_EVENTS, userRoom } from './types';
import type { SocketUser } from './types';

export function initializeWebSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigin,
      credentials: true,
    },
  });

  const emitter = new WebSocketEventEmitter(io);
  setWebSocketEmitter(emitter);

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const user = socket.data.user as SocketUser;

    socket.join(userRoom(user.id));

    if (user.role === 'ADMIN') {
      socket.join(ADMIN_PRESENCE_ROOM);
    }

    presenceTracker.addConnection(socket.id, user.id);
    emitter.emitPresenceGlobal(presenceTracker.getOnlineUserCount());

    void sendActivityCatchup(socket, user);
    registerPresenceHandlers(io, socket);

    socket.on(SOCKET_EVENTS.ACTIVITY_REQUEST_CATCHUP, () => {
      void sendActivityCatchup(socket, user);
    });

    socket.on('disconnect', () => {
      presenceTracker.removeConnection(socket.id);
      emitter.emitPresenceGlobal(presenceTracker.getOnlineUserCount());
    });
  });

  return io;
}

export { getWebSocketEmitter, setWebSocketEmitter } from './event.emitter';
export { SOCKET_EVENTS } from './types';
