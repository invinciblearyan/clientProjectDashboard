import type { AddressInfo } from 'net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { createHttpServer } from '../create-server';
import { env } from '../config/env';
import type { UserRole } from '@prisma/client';

export interface TestSocketServer {
  baseUrl: string;
  cleanup: () => Promise<void>;
}

export async function startTestSocketServer(): Promise<TestSocketServer & ReturnType<typeof createHttpServer>> {
  const bundle = createHttpServer();

  await new Promise<void>((resolve) => {
    bundle.httpServer.listen(0, resolve);
  });

  const address = bundle.httpServer.address() as AddressInfo;
  const baseUrl = `http://localhost:${address.port}`;

  const cleanup = async () => {
    bundle.io.close();
    await new Promise<void>((resolve, reject) => {
      bundle.httpServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  };

  return { ...bundle, baseUrl, cleanup };
}

export function signAccessToken(
  user: { id: string; email: string; role: UserRole },
  expiresIn: string | number = env.jwtAccessExpiresIn,
): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.jwtAccessSecret,
    { expiresIn } as jwt.SignOptions,
  );
}

export function connectSocket(baseUrl: string, token: string): ClientSocket {
  return ioClient(baseUrl, {
    auth: { token },
    transports: ['websocket'],
    forceNew: true,
  });
}

export function waitForConnect(socket: ClientSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket connect timeout')), 5000);
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.on('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

export function waitForEvent<T>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), 5000);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

export async function disconnectSocket(socket: ClientSocket): Promise<void> {
  if (!socket.connected) {
    return;
  }

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => resolve(), 3000);
    socket.once('disconnect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.disconnect();
  });

  await new Promise((resolve) => setTimeout(resolve, 50));
}
