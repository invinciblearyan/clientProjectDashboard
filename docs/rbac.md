# RBAC & Resource Ownership

Three roles: **Admin**, **Project Manager (PM)**, **Developer**.

Authorization is enforced at two layers:
1. **Route middleware** — verifies JWT (401 if missing/invalid) and required role.
2. **Service layer** — verifies resource ownership before any read/write (403 or intentional 404).

Frontend role hiding is UX only. Backend authorization is authoritative.

## Role Definitions

| Role | Description |
| ---- | ----------- |
| **ADMIN** | Full system access. Manages users and clients. Manages all projects and tasks. Sees global activity and live online-user count. |
| **PROJECT_MANAGER** | Creates projects assigned to existing clients. Manages **only projects they created** (`Project.createdById`). Manages tasks within those projects. Does **not** manage clients. |
| **DEVELOPER** | Views and updates status of **only assigned tasks**. No general project-management access. No client access. |

## Resource Ownership Rules

| Resource | Rule |
| -------- | ---- |
| User | Admin creates/manages users. No public registration. |
| Client | Admin manages clients. PM may **read** client list only to select a client when creating a project. |
| Project | `createdById` identifies owning PM. PM: own projects only. Admin: all. Developer: **no project access**. |
| Task (PM/Admin) | PM manages tasks in projects where `project.createdById = currentUser.id`. |
| Task (Developer) | Developer accesses tasks where `assigneeId = currentUser.id` only. |
| Notification | `userId` — users see only their own. |
| ActivityLog | Filtered by role: Admin global; PM own projects; Developer assigned tasks. |

## Permission Matrix

### Users

| Action | Admin | PM | Developer |
| ------ | ----- | -- | --------- |
| List all users | ✅ | ❌ | ❌ |
| Create user | ✅ | ❌ | ❌ |
| View any user | ✅ | ❌ | ❌ |
| Update any user | ✅ | ❌ | ❌ |
| Deactivate user | ✅ | ❌ | ❌ |
| View own profile (`/api/auth/me`) | ✅ | ✅ | ✅ |

### Clients

| Action | Admin | PM | Developer |
| ------ | ----- | -- | --------- |
| List clients | ✅ | ✅ read-only (for project creation) | ❌ |
| Create client | ✅ | ❌ | ❌ |
| View client | ✅ | ✅ read-only | ❌ |
| Update client | ✅ | ❌ | ❌ |
| Delete client | ✅ | ❌ | ❌ |

### Projects

| Action | Admin | PM | Developer |
| ------ | ----- | -- | --------- |
| List projects | ✅ all | ✅ own (`createdById`) | ❌ |
| Create project | ✅ | ✅ (select existing client) | ❌ |
| View project | ✅ all | ✅ own | ❌ |
| Update project | ✅ all | ✅ own | ❌ |
| Delete project | ✅ all | ✅ own | ❌ |

Developers do **not** receive project list/detail endpoints. Minimal project context (`id`, `name`) is embedded in authorized task responses only.

### Tasks

| Action | Admin | PM | Developer |
| ------ | ----- | -- | --------- |
| List tasks | ✅ all | ✅ in own projects | ✅ assigned only |
| Create task | ✅ | ✅ in own projects | ❌ |
| View task | ✅ all | ✅ in own projects | ✅ assigned only |
| Update task | ✅ all fields | ✅ all fields in own projects | ✅ **status only** on assigned tasks |
| Delete task | ✅ | ✅ in own projects | ❌ |
| Assign task (set `assigneeId`) | ✅ | ✅ in own projects | ❌ |

### Activity

| Action | Admin | PM | Developer |
| ------ | ----- | -- | --------- |
| View activity feed | ✅ global | ✅ own projects | ✅ assigned tasks only |
| Catch-up (last 20) | ✅ global | ✅ own projects | ✅ assigned tasks only |

### Notifications

| Action | Admin | PM | Developer |
| ------ | ----- | -- | --------- |
| List own notifications | ✅ | ✅ | ✅ |
| Mark as read / mark all read | ✅ own | ✅ own | ✅ own |
| Unread count (via WebSocket) | ✅ | ✅ | ✅ |

### Dashboard

| Action | Admin | PM | Developer |
| ------ | ----- | -- | --------- |
| View dashboard summary | ✅ (see API doc) | ✅ (see API doc) | ✅ (see API doc) |
| Live online-user count | ✅ via WebSocket | ❌ | ❌ |

## HTTP Status Code Policy

| Situation | Status | Example |
| --------- | ------ | ------- |
| Missing or invalid access token | **401** | No `Authorization` header |
| Authenticated but role not permitted for action | **403** | Developer calls `POST /api/projects` |
| Authenticated but does not own resource | **403** or **404** | PM updates another PM's project |
| Resource ID does not exist | **404** | Invalid UUID |
| Hide existence of inaccessible resource | **404** (intentional) | Developer requests another developer's task by ID |

Use **404 intentionally** only where revealing resource existence would leak information (e.g., cross-developer task access). Use **403** when the user is allowed to know the resource class exists but cannot perform the action (e.g., Developer attempting to create a project).

## API-Level Authorization Pattern

```
Request
  → authenticate middleware        // 401 if no valid JWT
  → authorize(role) middleware     // 403 if role insufficient
  → validate(schema) middleware    // 400 if input invalid
  → controller
  → service
      → load resource
      → assertAccess(resource, user)   // 403 or 404
      → perform operation
  → response
```

### Ownership assertion examples

```typescript
// PM project access
if (user.role === 'PROJECT_MANAGER' && project.createdById !== user.id) {
  throw new ApiError(404, 'NOT_FOUND', 'Project not found');
}

// Developer task access — hide existence
if (user.role === 'DEVELOPER' && task.assigneeId !== user.id) {
  throw new ApiError(404, 'NOT_FOUND', 'Task not found');
}

// Developer update — only status field allowed
if (user.role === 'DEVELOPER' && hasNonStatusFields(body)) {
  throw new ApiError(403, 'FORBIDDEN', 'Developers may only update task status');
}
```

## WebSocket Authorization Summary

| Role | Activity events | Task status updates | Presence |
| ---- | --------------- | ------------------- | -------- |
| Admin | All events globally | All project rooms joined when viewing | Global online-user count |
| PM | Own projects only | Own project rooms when viewing | Per-project presence in own projects |
| Developer | Assigned tasks only | Via `user:{id}` room (not project rooms) | Not applicable |

See [WebSocket Architecture](./websocket-architecture.md).

## Implementation Locations

| Concern | File |
| ------- | ---- |
| JWT authentication | `backend/src/middleware/authenticate.ts` |
| Role check | `backend/src/middleware/authorize.ts` |
| Ownership helpers | `backend/src/services/authorization.service.ts` |
| Per-resource checks | `backend/src/services/*.service.ts` |
