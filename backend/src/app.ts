import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import routes from './routes';
import apiRoutes from './routes/api.routes';
import { env } from './config/env';
import { requestIdMiddleware } from './middleware/request-id';
import { errorHandler } from './middleware/error-handler';

export function createApp(): express.Application {
  const app = express();

  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.use(routes);
  app.use('/api', apiRoutes);
  app.use(errorHandler);

  return app;
}
