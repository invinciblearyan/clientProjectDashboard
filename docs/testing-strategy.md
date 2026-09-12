# Testing Strategy

## Test Stack

| Layer | Tool |
| ----- | ---- |
| Backend unit/integration | Vitest + supertest |
| Frontend unit/component | Vitest + React Testing Library |
| Database | Test PostgreSQL (Docker or `DATABASE_URL_TEST`) |
| E2E (optional) | Playwright |

## Priority Test Areas

### 1. RBAC & Resource Ownership

| Test Case | Expected |
| --------- | -------- |
| PM lists projects | Only `createdById = self` |
| PM views another PM's project | 404 |
| PM creates task in another PM's project | 404 |
| Developer lists tasks | Only `assigneeId = self` |
| Developer views another developer's task by ID | 404 |
| Developer calls `GET /api/projects` | 403 |
| Developer updates assigned task status | 200 |
| Developer updates assigned task title | 403 |
| PM calls `POST /api/clients` | 403 |
| PM reads client list | 200 (read-only) |
| Admin creates user | 201 |
| Unauthenticated protected endpoint | 401 |

### 2. Authentication

| Test Case | Expected |
| --------- | -------- |
| Login valid credentials | 200 + access token + HttpOnly cookie |
| Login invalid credentials | 401 |
| Refresh valid cookie | 200 + rotated cookie |
| Reuse revoked refresh token | 401; all user tokens revoked |
| Logout | Cookie cleared; token revoked |
| Expired access token | 401 |
| Refresh token not in response body | Cookie only |

### 3. Activity Log

| Test Case | Expected |
| --------- | -------- |
| Task status change creates ActivityLog | Record with `previousStatus`, `newStatus`, `actorId`, `taskId` |
| Activity not derived from task state | Changing task does not alter old log entries |
| Cron overdue creates system activity | `source = SYSTEM`, `actorId = null` |

### 4. WebSocket

| Test Case | Expected |
| --------- | -------- |
| Unauthenticated connection | Rejected |
| Admin receives any activity event | Delivered |
| PM receives own-project activity | Delivered |
| PM does not receive other PM's activity | Not delivered |
| Developer receives assigned-task activity | Delivered |
| Developer does not receive unrelated activity | Not delivered |
| Developer cannot join project room | Rejected |
| Task status change emitted to project room | Admin/PM viewers receive |
| Task status change emitted to developer user room | Assigned developer receives |
| Catch-up returns last 20 from DB | Not from memory |
| Notification count on connect | Correct count emitted |
| No polling for notification count | Verified by absence of interval fetches |

### 5. Notifications

| Test Case | Expected |
| --------- | -------- |
| Task assigned | Notification for Developer + WS event |
| Task → IN_REVIEW | Notification for owning PM + WS event |
| Mark read updates count via WS | Count decremented |
| Mark all read | All marked; count = 0 via WS |
| User cannot read another's notification | 404 |

### 6. Overdue Processing

| Test Case | Expected |
| --------- | -------- |
| Past dueDate, not DONE | Cron sets `isOverdue = true` |
| Past dueDate, DONE | Not flagged |
| Already overdue | Not re-processed |
| Task marked DONE | `isOverdue` cleared by CRUD service |
| dueDate extended to future | `isOverdue` cleared by CRUD service |
| Dashboard does not compute overdue | Reads `isOverdue` flag only |
| Cron creates system activity | `actorId = null` |

### 7. Filters

| Test Case | Expected |
| --------- | -------- |
| Filter by status | Only matching tasks returned |
| Filter by priority | Only matching tasks returned |
| Filter by due-date range | Only matching tasks returned |
| Filters enforced server-side | Client cannot bypass with forged params |

## Seed Data Verification

After `npx prisma db seed`:
- 1 Admin, 2 PMs, 4 Developers exist
- ≥ 3 projects, ≥ 5 tasks per project
- ≥ 2 tasks with `isOverdue = true`
- Pre-existing ActivityLog entries present

Login integration tests may use development seed credentials from [Seed Data](./seed-data.md) (e.g., `admin@example.com` / `Admin123!Dev`). These credentials are for local/test environments only.

## Test Configuration

- `DATABASE_URL_TEST` for integration tests
- `ENABLE_CRON_JOBS=false` in test; invoke overdue job function directly
- Seed fixtures mirror production seed structure

## Notifications and overdue coverage

`backend/src/__tests__/notifications-and-overdue.test.ts` verifies assignment and
IN_REVIEW recipients, ownership-protected read operations, no-op IN_REVIEW behavior,
and idempotent persisted overdue transitions. `websocket.test.ts` verifies
`notification:new` and the PostgreSQL-backed `notification:count` are delivered only
to the assigned developer.

## Coverage Targets

| Area | Target |
| ---- | ------ |
| Authorization service | 90%+ |
| Auth service | 90%+ |
| Overdue job | 90%+ |
| WebSocket event filtering | 80%+ |
| Activity log creation | 90%+ |
