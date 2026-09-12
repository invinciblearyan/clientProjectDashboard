import type { ActivityLog, User, Project, Task } from '@prisma/client';
import type { ActivityEventPayload } from '../websocket/types';

type ActivityWithRelations = ActivityLog & {
  actor: Pick<User, 'id' | 'name' | 'email'> | null;
  project: Pick<Project, 'id' | 'name' | 'createdById'> | null;
  task: Pick<Task, 'id' | 'title' | 'assigneeId'> | null;
};

export function mapActivityToEvent(activity: ActivityWithRelations): ActivityEventPayload {
  return {
    id: activity.id,
    type: activity.type,
    summary: activity.summary,
    source: activity.source,
    actorId: activity.actorId,
    actor: activity.actor ? { id: activity.actor.id, name: activity.actor.name } : null,
    projectId: activity.projectId,
    taskId: activity.taskId,
    previousStatus: activity.previousStatus,
    newStatus: activity.newStatus,
    createdAt: activity.createdAt.toISOString(),
    project: activity.project
      ? {
          id: activity.project.id,
          name: activity.project.name,
          createdById: activity.project.createdById,
        }
      : null,
    task: activity.task
      ? {
          id: activity.task.id,
          title: activity.task.title,
          assigneeId: activity.task.assigneeId,
        }
      : null,
  };
}
