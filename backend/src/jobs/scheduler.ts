import cron, { type ScheduledTask } from 'node-cron';
import { env } from '../config/env';
import { processOverdueTasks } from './overdue-tasks.job';

let scheduledTask: ScheduledTask | null = null;

export function startBackgroundJobs(): ScheduledTask | null {
  if (!env.enableCronJobs || scheduledTask) return scheduledTask;
  scheduledTask = cron.schedule(env.overdueCronSchedule, () => {
    void processOverdueTasks().catch((error) => console.error('Overdue task job failed', error));
  });
  return scheduledTask;
}

export function stopBackgroundJobs(): void {
  scheduledTask?.stop();
  scheduledTask = null;
}
