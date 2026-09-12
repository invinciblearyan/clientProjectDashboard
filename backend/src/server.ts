import { createHttpServer } from './create-server';
import { env } from './config/env';
import { startBackgroundJobs } from './jobs/scheduler';

const { httpServer } = createHttpServer();

httpServer.listen(env.port, () => {
  console.log(`Server listening on port ${env.port}`);
  startBackgroundJobs();
});
