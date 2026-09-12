import type { Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { userRepository } from '../repositories/user.repository';
import type { SocketUser } from './types';

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  try {
    const token = socket.handshake.auth?.token;

    if (!token || typeof token !== 'string') {
      next(new Error('UNAUTHORIZED'));
      return;
    }

    const payload = verifyAccessToken(token);
    const user = await userRepository.findById(payload.sub);

    if (!user || !user.isActive) {
      next(new Error('UNAUTHORIZED'));
      return;
    }

    const socketUser: SocketUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    socket.data.user = socketUser;
    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
}
