import { ActivityType } from '@prisma/client';
import { activityLogRepository } from '../repositories/activity-log.repository';
import { taskRepository } from '../repositories/task.repository';
import { prisma } from '../utils/prisma';
import { getWebSocketEmitter } from '../websocket/event.emitter';

/** Processes only false-to-true overdue transitions; safe to invoke directly in tests. */
export async function processOverdueTasks(now = new Date()): Promise<number> {
  const candidates = await taskRepository.findTasksToMarkOverdue(now);
  let processed = 0;
  for (const task of candidates) {
    try {
      const activityId = await prisma.$transaction(async (tx) => {
        const update = await taskRepository.markOverdueIfEligible(task.id, now, tx);
        if (update.count === 0) return null;
        const activity = await activityLogRepository.create({
          type: ActivityType.TASK_MARKED_OVERDUE,
          source: 'SYSTEM', actorId: null, taskId: task.id, projectId: task.projectId,
          summary: `Task "${task.title}" marked as overdue`,
          metadata: { dueDate: task.dueDate?.toISOString() ?? null },
        }, tx);
        return activity.id;
      });
      if (!activityId) continue;
      processed += 1;
      const emitter = getWebSocketEmitter();
      if (emitter) {
        const activity = await activityLogRepository.findByIdWithRelations(activityId);
        if (activity) await emitter.emitActivity(activity);
      }
    } catch (error) {
      console.error(`Failed to process overdue task ${task.id}`, error);
    }
  }
  return processed;
}
