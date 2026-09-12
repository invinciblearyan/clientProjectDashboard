# REST API Design

Base path: `/api`

Architecture: `routes → controllers → services → repositories → Prisma`

All protected endpoints require `Authorization: Bearer <accessJWT>`.
Authorization enforced per [RBAC](./rbac.md). All inputs validated per [Validation & Errors](./validation-and-errors.md).

## Authentication

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/api/auth/login` | Public | Email + password → access token + refresh cookie |
| POST | `/api/auth/refresh` | Cookie | Rotate refresh token → new access token |
| POST | `/api/auth/logout` | Cookie | Revoke refresh token; clear cookie |
| GET | `/api/auth/me` | Required | Current user profile |

No public registration endpoint.

### POST `/api/auth/login` response

```json
{
  "data": {
    "accessToken": "<jwt>",
    "user": { "id": "...", "email": "...", "name": "...", "role": "PROJECT_MANAGER" }
  }
}
```
Plus `Set-Cookie: refreshToken=...` (HttpOnly).

---

## Users (Admin only)

| Method | Path | Roles | Description |
| ------ | ---- | ----- | ----------- |
| GET | `/api/users` | Admin | List all users |
| POST | `/api/users` | Admin | Create user with role |
| GET | `/api/users/:id` | Admin | Get user |
| PATCH | `/api/users/:id` | Admin | Update user (role, name, isActive) |
| DELETE | `/api/users/:id` | Admin | Deactivate user |

---

## Clients (Admin manages; PM reads for project creation)

| Method | Path | Roles | Description |
| ------ | ---- | ----- | ----------- |
| GET | `/api/clients` | Admin, PM | List clients (PM: read-only) |
| POST | `/api/clients` | Admin | Create client |
| GET | `/api/clients/:id` | Admin, PM | Get client (PM: read-only) |
| PATCH | `/api/clients/:id` | Admin | Update client |
| DELETE | `/api/clients/:id` | Admin | Delete client (if no linked projects) |

---

## Projects

| Method | Path | Roles | Description |
| ------ | ---- | ----- | ----------- |
| GET | `/api/projects` | Admin, PM | List projects (PM: own only) |
| POST | `/api/projects` | Admin, PM | Create project (`createdById` = current PM) |
| GET | `/api/projects/:id` | Admin, PM | Get project (PM: own only) |
| PATCH | `/api/projects/:id` | Admin, PM | Update project (PM: own only) |
| DELETE | `/api/projects/:id` | Admin, PM | Delete project (PM: own only) |

Developers have **no project endpoints**.

### Query parameters (GET `/api/projects`)

| Param | Type | Description |
| ----- | ---- | ----------- |
| `status` | ProjectStatus | Filter by status |
| `clientId` | string | Filter by client |
| `page`, `limit` | number | Pagination |

---

## Tasks

| Method | Path | Roles | Description |
| ------ | ---- | ----- | ----------- |
| GET | `/api/tasks` | Admin, PM, Developer | List tasks (role-scoped) |
| POST | `/api/tasks` | Admin, PM | Create task (PM: own project only) |
| GET | `/api/tasks/:id` | Admin, PM, Developer | Get task (role-scoped) |
| PATCH | `/api/tasks/:id` | Admin, PM, Developer | Update task (Developer: status only) |
| DELETE | `/api/tasks/:id` | Admin, PM | Delete task (PM: own project only) |

---

## Notifications

Every notification endpoint requires authentication and is scoped in the database to
the current user; notification recipients are never accepted from request input.

| Method | Path | Roles | Description |
| ------ | ---- | ----- | ----------- |
| GET | `/api/notifications` | Any authenticated user | List only the caller's notifications |
| GET | `/api/notifications/unread-count` | Any authenticated user | Database-authoritative unread count |
| PATCH | `/api/notifications/:id/read` | Any authenticated user | Mark caller-owned notification read |
| PATCH | `/api/notifications/read-all` | Any authenticated user | Mark all caller-owned notifications read |

Foreign notification IDs return `404`; they are never fetched and filtered client-side.

### Developer task response shape

Developers receive minimal project context embedded in task responses — not via project endpoints:

```json
{
  "data": {
    "id": "task_abc",
    "title": "Implement login",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "dueDate": "2026-09-15T00:00:00.000Z",
    "isOverdue": false,
    "assigneeId": "dev_xyz",
    "project": {
      "id": "proj_123",
      "name": "Client Portal"
    }
  }
}
```

### Developer PATCH allowed fields

Developers may update **only `status`** on assigned tasks. All other fields → 403.

Moving status to `IN_REVIEW` triggers notification to owning PM.

### Query parameters (GET `/api/tasks`) — shareable URLs

All filters enforced server-side:

| Param | Type | Description |
| ----- | ---- | ----------- |
| `status` | TaskStatus | Filter by status |
| `priority` | TaskPriority | Filter by priority |
| `dueDateFrom` | ISO date | Due date range start |
| `dueDateTo` | ISO date | Due date range end |
| `projectId` | string | Filter by project (Admin/PM) |
| `assigneeId` | string | Filter by assignee (Admin/PM) |
| `isOverdue` | boolean | Filter overdue tasks |
| `page`, `limit` | number | Pagination |

Example shareable URL: `/tasks?status=IN_PROGRESS&priority=HIGH&dueDateFrom=2026-09-01&dueDateTo=2026-09-30`

### Developer list sort (server-side default)

When role is Developer: sort by `priority` (`CRITICAL` → `HIGH` → `MEDIUM` → `LOW`), then `dueDate` ascending.

---

## Activity

| Method | Path | Roles | Description |
| ------ | ---- | ----- | ----------- |
| GET | `/api/activity` | All | Paginated activity feed (role-scoped) |
| GET | `/api/activity/catchup` | All | Last 20 events from PostgreSQL (role-scoped) |

Activity records for task status changes include `previousStatus`, `newStatus`, `actorId`, `taskId`, `createdAt`.

### Query parameters

| Param | Description |
| ----- | ----------- |
| `projectId` | Filter by project (must be authorized) |
| `limit` | Default 20, max 50 |
| `before` | Cursor for pagination |

---

## Notifications

| Method | Path | Roles | Description |
| ------ | ---- | ----- | ----------- |
| GET | `/api/notifications` | All | List own notifications |
| GET | `/api/notifications/unread-count` | All | Unread count (initial load; updates via WebSocket) |
| PATCH | `/api/notifications/:id/read` | All | Mark single notification read |
| PATCH | `/api/notifications/read-all` | All | Mark all notifications read |

### Required notification triggers (service layer)

| Event | Recipient |
| ----- | --------- |
| Task assigned to Developer | That Developer |
| Task status → `IN_REVIEW` | PM who owns project (`project.createdById`) |

---

## Dashboard

| Method | Path | Roles | Description |
| ------ | ---- | ----- | ----------- |
| GET | `/api/dashboard` | All authenticated roles | Role-aware summary derived from `req.user.role` |

No request body or role override query parameters are supported. The server derives the dashboard variant from the authenticated user.

Reads persisted `isOverdue` flag — does not compute overdue at request time.

### Admin response

```json
{
  "data": {
    "totalProjects": 12,
    "tasksByStatus": {
      "TODO": 10,
      "IN_PROGRESS": 15,
      "IN_REVIEW": 5,
      "DONE": 40
    },
    "overdueTaskCount": 3,
    "activeUsersOnline": 4
  }
}
```

- `totalProjects` counts all projects.
- `tasksByStatus` counts all tasks grouped by status (missing statuses return `0`).
- `overdueTaskCount` counts tasks where persisted `isOverdue = true`.
- `activeUsersOnline` reads the in-memory presence tracker (unique connected users). Returns `0` when nobody is connected.

Live presence updates also continue via WebSocket `presence:global`.

### PM response

```json
{
  "data": {
    "projectCount": 4,
    "tasksByPriority": {
      "LOW": 5,
      "MEDIUM": 12,
      "HIGH": 3,
      "CRITICAL": 2
    },
    "upcomingDueThisWeek": [
      {
        "id": "...",
        "title": "...",
        "priority": "HIGH",
        "status": "IN_PROGRESS",
        "dueDate": "2026-09-15T00:00:00.000Z",
        "project": { "id": "...", "name": "..." }
      }
    ]
  }
}
```

PM scoping rules:
- `projectCount` includes only projects where `createdById = current PM`.
- `tasksByPriority` includes only tasks belonging to that PM's projects.
- `upcomingDueThisWeek` includes only non-`DONE` tasks on those projects with `dueDate` between the start and end of the current calendar week (Monday–Sunday, server local time).

### Developer response

```json
{
  "data": {
    "assignedTasks": [
      {
        "id": "...",
        "title": "...",
        "status": "IN_PROGRESS",
        "priority": "HIGH",
        "dueDate": "2026-09-15T00:00:00.000Z",
        "isOverdue": false,
        "project": { "id": "...", "name": "..." }
      }
    ]
  }
}
```

Sorted server-side: priority (`CRITICAL` → `HIGH` → `MEDIUM` → `LOW`), then due date ascending.
Only tasks where `assigneeId = current developer` are returned.

---

## Health (existing)

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| GET | `/health` | Public | Server health check |

---

## Route Organization

```
backend/src/routes/
├── index.ts
├── auth.routes.ts
├── user.routes.ts
├── client.routes.ts
├── project.routes.ts
├── task.routes.ts
├── activity.routes.ts
├── notification.routes.ts
└── dashboard.routes.ts
```

## Pagination Convention

```json
{
  "data": [ ... ],
  "pagination": { "page": 1, "limit": 20, "total": 87, "totalPages": 5 }
}
```

## Mutation Side Effects

Create/update/delete operations trigger (in service layer):
1. `ActivityLog` record (with `previousStatus`/`newStatus` for status changes)
2. `Notification` when applicable
3. Socket.IO events (`task:status-changed`, `activity:event`, `notification:new`, `notification:count`)
