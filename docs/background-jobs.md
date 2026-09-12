# Background Jobs — Overdue Task Processing

Automatically identifies and flags overdue tasks using **node-cron**.

## Responsibility Split

| Responsibility | Owner |
| -------------- | ----- |
| Detect overdue tasks (`dueDate` passed, not `DONE`) | **node-cron scheduler** |
| Set `isOverdue = true` | **node-cron scheduler** |
| Clear `isOverdue` when task completed or due date extended | **Task CRUD service** (ordinary update) |
| Overdue count on dashboard | **Read `isOverdue` flag** — no runtime date calculation on page load |

**Do not** compute overdue status inside dashboard or list API handlers. The scheduler is the sole mechanism for marking tasks overdue.

## Overdue Definition

A task is overdue when:
- `dueDate IS NOT NULL`
- `dueDate < NOW()`
- `status != DONE`

## Job: `overdue-tasks.job.ts`

**Location:** `backend/src/jobs/overdue-tasks.job.ts`
**Registered in:** `backend/src/server.ts` after the HTTP server begins listening (via `jobs/scheduler.ts`)
**Disabled in tests:** `ENABLE_CRON_JOBS=false`; invoke job function directly in tests

## Schedule

| Environment | Default | Configurable via |
| ----------- | ------- | ---------------- |
| Production | `0 * * * *` (hourly) | `OVERDUE_CRON_SCHEDULE` |
| Development | `*/5 * * * *` (every 5 min) | `OVERDUE_CRON_SCHEDULE` |

## Algorithm

```
1. Find tasks WHERE:
     dueDate IS NOT NULL
     AND dueDate < NOW()
     AND status != 'DONE'
     AND isOverdue = false

2. For each matching task:
     a. Set isOverdue = true, overdueAt = NOW()
     b. Create ActivityLog:
        - type: TASK_MARKED_OVERDUE
        - source: SYSTEM
        - actorId: null
        - taskId, projectId
        - summary: human-readable message
     c. Commit the transaction.
     d. Emit the role-filtered `activity:event` through the existing Socket.IO emitter.

3. Log job summary (count processed)
```

## Clearing `isOverdue` (CRUD Service — Not Scheduler)

When a task is updated via normal API:

| Condition | Action |
| --------- | ------ |
| Status changed to `DONE` | Set `isOverdue = false`, `overdueAt = null` |
| `dueDate` changed to future date | Set `isOverdue = false`, `overdueAt = null` |

No activity log required for clearing overdue flag.

## Prisma Query (repository)

```typescript
async findTasksToMarkOverdue() {
  return prisma.task.findMany({
    where: {
      dueDate: { lt: new Date() },
      status: { not: 'DONE' },
      isOverdue: false,
    },
    include: { project: true, assignee: true },
  });
}
```

## Activity Log for Cron Events

```json
{
  "type": "TASK_MARKED_OVERDUE",
  "source": "SYSTEM",
  "actorId": null,
  "taskId": "...",
  "projectId": "...",
  "summary": "Task 'Fix login bug' marked as overdue",
  "metadata": { "dueDate": "2026-09-10T00:00:00.000Z" }
}
```

No fake Admin or System user. `actorId` is null; `source = SYSTEM`.

## Idempotency

- Candidate selection uses `isOverdue = false`; each candidate is then claimed with an
  atomic scoped `updateMany` carrying the same eligibility predicates. Only the
  invocation that changes one row creates the activity.
- Safe to run on overlapping schedules without duplicate transition activities.

## Error Handling

| Scenario | Behavior |
| -------- | -------- |
| DB connection failure | Log error; retry next tick |
| Single task failure | Log error; continue remaining tasks |
| WebSocket emit failure | Log warning; DB state still committed |

## Operational limitation

The scheduler is process-local. This deployment intentionally assumes one backend
instance; no distributed lock, Redis, or message broker is used.

## Environment Variables

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `OVERDUE_CRON_SCHEDULE` | `0 * * * *` | Cron expression |
| `ENABLE_CRON_JOBS` | `true` | Set `false` in test environment |
