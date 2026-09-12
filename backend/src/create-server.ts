import { createServer } from 'http';
import type { Application } from 'express';
import type { Server as HttpServer } from 'http';
import type { Server as SocketServer } from 'socket.io';
import { createApp } from './app';
import { initializeWebSocket } from './websocket';

export interface HttpServerBundle {
  app: Application;
  httpServer: HttpServer;
  io: SocketServer;
}

export function createHttpServer(): HttpServerBundle {
  const app = createApp();
  const httpServer = createServer(app);
  const io = initializeWebSocket(httpServer);

  return { app, httpServer, io };
}
