# WebSocket Architecture (Socket.IO)

Real-time updates use **Socket.IO only** — no polling or SSE. Catch-up loads the last 20 events from PostgreSQL, not an in-memory cache.

Socket.IO attaches to the same HTTP server as Express in `backend/src/server.ts`.

## Server Structure

```
backend/src/websocket/
├── index.ts
├── auth.middleware.ts
├── room.manager.ts
├── event.emitter.ts
└── handlers/
    ├── presence.handler.ts
    └── catchup.handler.ts
```

## Connection & Authentication

```typescript
const socket = io(API_URL, {
  auth: { token: accessToken },
  withCredentials: true
});
```

1. Extract `socket.handshake.auth.token`
2. Verify access JWT (same secret as REST middleware)
3. Attach `socket.data.user = { id, role, name }`
4. Reject connection if invalid — no anonymous sockets

## Room Strategy

| Room | Pattern | Members |
| ---- | ------- | ------- |
| User (personal) | `user:{userId}` | Only that user — notifications, developer task updates, catch-up delivery |
| Project | `project:{projectId}` | Admin and owning PM when actively viewing a project |
| Admin (global) | `admin:presence` | Connected Admin users — global presence count |

### Join logic on connect

```
All authenticated users:
  → join user:{userId}

Admin:
  → join admin:presence
  → receives global activity via targeted emit (not project-room dependent)

PM:
  → does NOT auto-join all project rooms
  → joins project:{id} on presence:join when viewing a project (server validates ownership)

Developer:
  → stays in user:{userId} only
  → does NOT join project rooms
  → receives task-status updates via user:{userId}
```

## Event Catalog

### Server → Client

| Event | Payload | Recipients |
| ----- | ------- | ---------- |
| `activity:event` | Activity log record | Role-filtered (see below) |
| `activity:catchup` | `{ events: ActivityEvent[] }` | Connecting user (last 20 from DB) |
| `task:status-changed` | `{ taskId, projectId, previousStatus, newStatus, task }` | `project:{projectId}` room + `user:{assigneeId}` if assigned |
| `notification:new` | Notification record | `user:{userId}` |
| `notification:count` | `{ unreadCount: number }` | `user:{userId}` |
| `presence:project` | `{ projectId, users: [{ id, name }] }` | `project:{projectId}` room |
| `presence:global` | `{ onlineCount: number }` | `admin:presence` room |

### Client → Server

| Event | Payload | Purpose |
| ----- | ------- | ------- |
| `presence:join-project` | `{ projectId }` | Join project room when viewing (server validates) |
| `presence:leave-project` | `{ projectId }` | Leave project room |
| `activity:request-catchup` | `{ projectId? }` | Request last 20 events from PostgreSQL |

No client-emitted mutation events. All data changes go through REST API.

## Authorized Event Delivery

### Activity events (`activity:event`)

| Role | Delivery rule |
| ---- | ------------- |
| **Admin** | All activity events → `user:{adminId}` for each connected admin |
| **PM** | Only where `activity.project.createdById === user.id` → `user:{pmId}` |
| **Developer** | Only where `activity.taskId` references a task with `assigneeId === user.id` → `user:{developerId}` |

Server evaluates filters **before** emit. Client-side filtering is not a security mechanism.

### Task status updates (`task:status-changed`)

Required: users viewing a project receive task-status updates live without page refresh.

| Recipient | How |
| --------- | --- |
| Admin / PM viewing project | Emit to `project:{projectId}` (joined via `presence:join-project`) |
| Assigned Developer | Emit to `user:{assigneeId}` (always, regardless of project room) |

### Notifications

| Trigger | WebSocket delivery |
| ------- | ------------------ |
| Task assigned | `notification:new` + updated `notification:count` → `user:{developerId}` |
| Task moved to IN_REVIEW | `notification:new` + updated `notification:count` → `user:{pmId}` |
| Mark read (via REST) | Updated `notification:count` → `user:{userId}` |

Unread count updates **only via WebSocket** after initial connect — no polling.

## Online Presence

### Admin: global online-user count

- Track count of authenticated connected sockets server-wide
- On connect/disconnect: emit `presence:global { onlineCount }` to `admin:presence` room
- Admin dashboard displays this count live

### Project presence (Admin & PM)

- On `presence:join-project`: validate access, add socket to `project:{projectId}`
- Broadcast `presence:project` with connected users in that room
- On `presence:leave-project` or disconnect: update and rebroadcast

Developers do not participate in project presence.

## Database-Backed Catch-Up (Last 20 Events)

On connect or `activity:request-catchup`, query **PostgreSQL** (not memory):

| Role | Query filter |
| ---- | ------------ |
| Admin | Last 20 globally: `ORDER BY createdAt DESC LIMIT 20` |
| PM | Last 20 where `project.createdById = user.id` |
| Developer | Last 20 where `task.assigneeId = user.id` |

Emit `activity:catchup` in chronological order. Client deduplicates by `id`.

## Reconnection

```typescript
socket.on('connect', () => {
  socket.emit('activity:request-catchup');
  // notification count re-sent by server on connect
});
```

Socket.IO handles transport reconnection. Each reconnect re-runs catch-up from DB.

## Security Rules

| Rule | Enforcement |
| ---- | ----------- |
| No unauthenticated connections | `auth.middleware.ts` |
| No unauthorized project room joins | `room.manager.ts` validates PM ownership or Admin role |
| Developers never join project rooms | `room.manager.ts` rejects Developer `presence:join-project` |
| Server-side event filtering | `event.emitter.ts` — never rely on client filtering |
| Mutations via REST only | WebSocket is push/read from client perspective |
| Catch-up from DB only | `catchup.handler.ts` queries `ActivityLog` table |

## Service Integration

```typescript
// task.service.ts — status change in a single Prisma transaction, then emit
const { updatedTask, activity } = await prisma.$transaction(async (tx) => {
  const updatedTask = await tx.task.update({ ... });
  const activity = await activityService.logTaskStatusChange({ ... }, tx);
  return { updatedTask, activity };
});

const emitter = getWebSocketEmitter();
if (emitter) {
  const activityWithRelations = await activityLogRepository.findByIdWithRelations(activity.id);
  if (activityWithRelations) await emitter.emitActivity(activityWithRelations);
  emitter.emitTaskStatusChanged(updatedTask, previousStatus, newStatus);
}
```

Notifications are persisted before delivery. Assignment and IN_REVIEW transitions
emit `notification:new`, followed by `notification:count` obtained from PostgreSQL.

## Source layout

| Component | File |
| --------- | ---- |
| Socket.IO bootstrap | `backend/src/websocket/index.ts` |
| HTTP server wiring | `backend/src/create-server.ts`, `backend/src/server.ts` |
| Socket auth | `backend/src/websocket/auth.middleware.ts` |
| Room authorization | `backend/src/websocket/room.manager.ts` |
| Activity emitter | `backend/src/websocket/event.emitter.ts` |
| Catch-up handler | `backend/src/websocket/handlers/catchup.handler.ts` |
| Presence handler | `backend/src/websocket/handlers/presence.handler.ts` |
| Presence tracker | `backend/src/websocket/presence.tracker.ts` |
| Express CORS | `backend/src/app.ts` (`CORS_ORIGIN` env) |

### CORS

| Environment | `CORS_ORIGIN` | Notes |
| ----------- | ------------- | ----- |
| Local dev | `http://localhost:5173` | Express + Socket.IO both use this origin with `credentials: true` |
| Production | `https://<vercel-app>.vercel.app` | Railway backend; refresh cookie uses `SameSite=None; Secure` |

No wildcard (`*`) origin when credentials are enabled.

### Catch-up Payload

```typescript
// activity:catchup
{
  events: ActivityEventPayload[];  // chronological (oldest first), max 20
  count: number;
  serverTimestamp: string;         // ISO-8601
}
```

### Activity Event Payload

```typescript
// activity:event
{
  event: {
    id, type, summary, source,
    actorId, actor: { id, name } | null,
    projectId, taskId,
    previousStatus, newStatus,
    createdAt,
    project: { id, name, createdById } | null,
    task: { id, title, assigneeId } | null
  }
}
```

### Presence

- `presence:global` → `{ onlineCount: number }` emitted to `admin:presence` room only
- `presence:project` → `{ projectId, users: [{ id, name }] }` for authorized project room members
- Connection counts per user tracked in-memory (`presence.tracker.ts`); not persisted to PostgreSQL

### Single-Instance Limitation

Presence and room membership are stored in the Node.js process memory (Socket.IO adapter default). A single backend instance is assumed; horizontal scaling would require a shared adapter (e.g. Redis).
