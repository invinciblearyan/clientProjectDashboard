# Database Design

PostgreSQL schema managed by Prisma. All primary keys use `cuid()`.

## Entity Relationship Overview

```
User ───────────── creates ──► Project ──► belongs to ──► Client
  │                               │
  │                               └── has many ──► Task
  │                                                  │
  └── assigned to ◄──────────────────────────────────┘

User ──► RefreshToken
User ──► Notification
User ──► ActivityLog (as actor, nullable for system events)

ActivityLog ──► references Project, Task (optional)
Notification ──► references User, Project, Task (optional)

Client: managed by Admin only. No ownership field on Client.
Project.createdById: PM ownership anchor.
Task.assigneeId: Developer access anchor.
```

## Enums

```prisma
enum UserRole {
  ADMIN
  PROJECT_MANAGER
  DEVELOPER
}

enum ProjectStatus {
  PLANNED
  IN_PROGRESS
  ON_HOLD
  COMPLETED
  CANCELLED
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  DONE
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum ActivityType {
  PROJECT_CREATED
  PROJECT_UPDATED
  PROJECT_STATUS_CHANGED
  TASK_CREATED
  TASK_UPDATED
  TASK_ASSIGNED
  TASK_STATUS_CHANGED
  TASK_MARKED_OVERDUE
  CLIENT_CREATED
  CLIENT_UPDATED
}

enum ActivitySource {
  USER
  SYSTEM
}

enum NotificationType {
  TASK_ASSIGNED
  TASK_IN_REVIEW
  TASK_OVERDUE
  TASK_STATUS_CHANGED
  PROJECT_UPDATED
}
```

## Tables

### User

| Column | Type | Constraints | Notes |
| ------ | ---- | ----------- | ----- |
| id | String | PK | `cuid()` |
| email | String | UNIQUE, NOT NULL | Login identifier |
| passwordHash | String | NOT NULL | bcrypt hash |
| name | String | NOT NULL | Display name |
| role | UserRole | NOT NULL | ADMIN, PROJECT_MANAGER, DEVELOPER |
| isActive | Boolean | NOT NULL, default `true` | Soft-disable accounts |
| createdAt | DateTime | NOT NULL | |
| updatedAt | DateTime | NOT NULL | |

**Indexes:**

| Index | Query pattern |
| ----- | ------------- |
| `email` (unique) | Login lookup by email |
| `role` | Admin user-management listing |

**Relationships:**
- `projectsCreated` → Project[] (via `Project.createdById`)
- `tasksAssigned` → Task[] (via `Task.assigneeId`)
- `refreshTokens` → RefreshToken[]
- `notifications` → Notification[]
- `activities` → ActivityLog[] (as actor, optional)

**Registration:** No public self-registration. Admin creates users via API.

---

### Client

| Column | Type | Constraints | Notes |
| ------ | ---- | ----------- | ----- |
| id | String | PK | |
| name | String | NOT NULL | |
| company | String | NULL | |
| contactEmail | String | NULL | |
| createdAt | DateTime | NOT NULL | |
| updatedAt | DateTime | NOT NULL | |

**No `createdById`** — clients are organization-level records managed by Admin only. PMs reference existing clients when creating projects.

**Indexes:**

| Index | Query pattern |
| ----- | ------------- |
| `name` | Admin client list search/sort |

**Relationships:**
- `projects` → Project[]

---

### Project

| Column | Type | Constraints | Notes |
| ------ | ---- | ----------- | ----- |
| id | String | PK | |
| name | String | NOT NULL | |
| description | String | NULL | |
| status | ProjectStatus | NOT NULL, default `PLANNED` | |
| clientId | String | FK → Client.id, NOT NULL | |
| createdById | String | FK → User.id, NOT NULL | **PM ownership anchor** |
| startDate | DateTime | NULL | |
| dueDate | DateTime | NULL | |
| createdAt | DateTime | NOT NULL | |
| updatedAt | DateTime | NOT NULL | |

**Indexes:**

| Index | Query pattern |
| ----- | ------------- |
| `createdById` | PM lists own projects |
| `clientId` | Projects by client |
| `status` | Dashboard/filter by status |
| `(createdById, status)` | PM dashboard: own projects filtered by status |

**Relationships:**
- `client` → Client
- `createdBy` → User
- `tasks` → Task[]
- `activityLogs` → ActivityLog[]

**Ownership rule:** PM may only view/edit/delete projects where `createdById = currentUser.id`. Admin has full access.

---

### Task

| Column | Type | Constraints | Notes |
| ------ | ---- | ----------- | ----- |
| id | String | PK | |
| title | String | NOT NULL | |
| description | String | NULL | |
| status | TaskStatus | NOT NULL, default `TODO` | Includes `IN_REVIEW` |
| priority | TaskPriority | NOT NULL, default `MEDIUM` | |
| projectId | String | FK → Project.id, NOT NULL, ON DELETE CASCADE | |
| assigneeId | String | FK → User.id, NULL | Must reference DEVELOPER role |
| dueDate | DateTime | NULL | Used by overdue cron job |
| isOverdue | Boolean | NOT NULL, default `false` | Set/cleared by cron or CRUD service |
| overdueAt | DateTime | NULL | When marked overdue by scheduler |
| createdById | String | FK → User.id, NOT NULL | |
| createdAt | DateTime | NOT NULL | |
| updatedAt | DateTime | NOT NULL | |

**Indexes:**

| Index | Query pattern |
| ----- | ------------- |
| `projectId` | Tasks within a project (PM/Admin) |
| `assigneeId` | Developer assigned-task list |
| `status` | Filter by status query param |
| `priority` | Filter/sort by priority |
| `dueDate` | Filter by due-date range; overdue cron scan |
| `(assigneeId, status)` | Developer dashboard: assigned tasks by status |
| `(assigneeId, priority, dueDate)` | Developer dashboard sort: priority then due date |
| `(projectId, status)` | PM project task board |
| `(isOverdue, dueDate)` | Overdue cron: find candidates not yet flagged |

**Relationships:**
- `project` → Project
- `assignee` → User (nullable)
- `createdBy` → User

**Access rule:** Developer may only read/update tasks where `assigneeId = currentUser.id`. No general project access.

**Application-enforced:** `assignee.role = DEVELOPER` when `assigneeId` is set.

**Overdue flag lifecycle:**
- Set `isOverdue = true` by **node-cron scheduler only** (not dashboard/page-load logic)
- Cleared by **task CRUD service** when status becomes `DONE` or `dueDate` moves to the future
- Overdue definition: `dueDate < now()` AND `status != DONE`

---

### ActivityLog

Append-only, persistent activity records. **Never reconstructed from current task state.**

| Column | Type | Constraints | Notes |
| ------ | ---- | ----------- | ----- |
| id | String | PK | |
| type | ActivityType | NOT NULL | |
| summary | String | NOT NULL | Human-readable message |
| source | ActivitySource | NOT NULL, default `USER` | `USER` or `SYSTEM` |
| actorId | String | FK → User.id, NULL | Null for system/cron events |
| projectId | String | FK → Project.id, NULL | Scope for PM filtering |
| taskId | String | FK → Task.id, NULL | Scope for Developer filtering |
| clientId | String | FK → Client.id, NULL | Optional |
| previousStatus | TaskStatus | NULL | Required for `TASK_STATUS_CHANGED` |
| newStatus | TaskStatus | NULL | Required for `TASK_STATUS_CHANGED` |
| metadata | Json | NULL | Additional structured context |
| createdAt | DateTime | NOT NULL | Immutable timestamp |

**Task status change records must include:** `taskId`, `actorId` (if user-initiated), `previousStatus`, `newStatus`, `createdAt`.

**No `updatedAt`** — records are never modified.

**Indexes:**

| Index | Query pattern |
| ----- | ------------- |
| `createdAt DESC` | Global activity feed ordering |
| `projectId` | PM activity scoped to own projects |
| `taskId` | Developer activity scoped to assigned tasks |
| `(projectId, createdAt DESC)` | PM catch-up: last 20 for own projects |
| `(taskId, createdAt DESC)` | Developer catch-up: last 20 for assigned tasks |

**System events (overdue cron):** `source = SYSTEM`, `actorId = null`. No fake Admin/System user.

---

### Notification

| Column | Type | Constraints | Notes |
| ------ | ---- | ----------- | ----- |
| id | String | PK | |
| userId | String | FK → User.id, NOT NULL, ON DELETE CASCADE | Recipient |
| type | NotificationType | NOT NULL | |
| title | String | NOT NULL | |
| message | String | NOT NULL | |
| projectId | String | FK → Project.id, NULL | |
| taskId | String | FK → Task.id, NULL | |
| isRead | Boolean | NOT NULL, default `false` | |
| createdAt | DateTime | NOT NULL | |
| readAt | DateTime | NULL | Set when marked read |

**Required notification flows:**

| Trigger | Recipient | Type |
| ------- | --------- | ---- |
| Task assigned to Developer | That Developer | `TASK_ASSIGNED` |
| Task moved to `IN_REVIEW` | PM who owns project (`project.createdById`) | `TASK_IN_REVIEW` |

**Indexes:**

| Index | Query pattern |
| ----- | ------------- |
| `(userId, isRead)` | Unread count query |
| `(userId, createdAt DESC)` | Notification dropdown list |

---

### RefreshToken

Server-side session representation for refresh JWT rotation and revocation.

| Column | Type | Constraints | Notes |
| ------ | ---- | ----------- | ----- |
| id | String | PK | |
| userId | String | FK → User.id, NOT NULL, ON DELETE CASCADE | |
| tokenHash | String | UNIQUE, NOT NULL | SHA-256 of refresh token |
| expiresAt | DateTime | NOT NULL | |
| revokedAt | DateTime | NULL | Set on logout or rotation |
| replacedByTokenId | String | FK → RefreshToken.id, NULL | Rotation chain |
| userAgent | String | NULL | Optional audit |
| ipAddress | String | NULL | Optional audit |
| createdAt | DateTime | NOT NULL | |

**Indexes:**

| Index | Query pattern |
| ----- | ------------- |
| `tokenHash` (unique) | Refresh token lookup |
| `userId` | Revoke all tokens for user |
| `(userId, revokedAt)` | Active sessions per user |
| `expiresAt` | Cleanup of expired tokens |

**Storage rule:** Never store the raw refresh token — only its hash.

---

## Seed Data Requirements

See [Seed Data](./seed-data.md) for full entity counts, development credentials, and security rules.

Summary:
- Seed script: `backend/prisma/seed.ts`
- Users: 1 Admin, 2 PMs, 4 Developers (bcrypt-hashed passwords only)
- Data: ≥ 3 clients, ≥ 3 projects, ≥ 5 tasks per project, ≥ 2 overdue, pre-existing activity logs
- Run via: `npx prisma db seed`

---

## Prisma File Location

```
backend/prisma/
├── schema.prisma
├── seed.ts
└── migrations/
```

Repository layer (`backend/src/repositories/`) owns all Prisma queries. No raw SQL in controllers.
