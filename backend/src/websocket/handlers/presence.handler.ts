import type { Server, Socket } from 'socket.io';
import { roomManager } from '../room.manager';
import type { SocketUser } from '../types';
import { SOCKET_EVENTS, projectRoom } from '../types';

function getProjectPresenceUsers(
  io: Server,
  projectId: string,
): Array<{ id: string; name: string }> {
  const room = io.sockets.adapter.rooms.get(projectRoom(projectId));
  if (!room) {
    return [];
  }

  const users = new Map<string, string>();

  for (const socketId of room) {
    const socket = io.sockets.sockets.get(socketId);
    const user = socket?.data.user as SocketUser | undefined;
    if (user) {
      users.set(user.id, user.name);
    }
  }

  return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
}

function broadcastProjectPresence(io: Server, projectId: string): void {
  const users = getProjectPresenceUsers(io, projectId);
  io.to(projectRoom(projectId)).emit(SOCKET_EVENTS.PRESENCE_PROJECT, {
    projectId,
    users,
  });
}

export function registerPresenceHandlers(io: Server, socket: Socket): void {
  const user = socket.data.user as SocketUser;

  socket.on(SOCKET_EVENTS.PRESENCE_JOIN_PROJECT, async (payload, callback) => {
    const projectId = payload?.projectId;

    if (!projectId || typeof projectId !== 'string') {
      callback?.({ error: 'INVALID_REQUEST' });
      return;
    }

    const allowed = await roomManager.authorizeProjectJoin(user, projectId);
    if (!allowed) {
      callback?.({ error: 'FORBIDDEN' });
      return;
    }

    await socket.join(projectRoom(projectId));
    broadcastProjectPresence(io, projectId);
    callback?.({ success: true });
  });

  socket.on(SOCKET_EVENTS.PRESENCE_LEAVE_PROJECT, async (payload) => {
    const projectId = payload?.projectId;
    if (!projectId || typeof projectId !== 'string') {
      return;
    }

    await socket.leave(projectRoom(projectId));
    broadcastProjectPresence(io, projectId);
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room.startsWith('project:')) {
        const projectId = room.slice('project:'.length);
        socket.once('disconnect', () => {
          broadcastProjectPresence(io, projectId);
        });
      }
    }
  });
}
