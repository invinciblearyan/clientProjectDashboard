# Frontend Architecture

React + TypeScript + Vite SPA. Deployed to Vercel.

## Directory Structure

```
frontend/src/
├── api/
│   ├── client.ts           # HTTP client with auth interceptor + withCredentials
│   ├── auth.api.ts
│   ├── users.api.ts
│   ├── clients.api.ts
│   ├── projects.api.ts
│   ├── tasks.api.ts
│   ├── activity.api.ts
│   ├── notifications.api.ts
│   └── dashboard.api.ts
├── components/
│   ├── common/             # Button, Input, Badge, Spinner, EmptyState
│   ├── layout/             # AppShell, Sidebar, Header, NotificationBell
│   └── features/
│       ├── dashboard/
│       ├── projects/
│       ├── tasks/
│       ├── activity/
│       └── notifications/
├── contexts/
│   └── AuthContext.tsx     # User + in-memory access token
├── hooks/
│   ├── useAuth.ts
│   ├── useSocket.ts
│   └── useNotifications.ts
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── ClientsPage.tsx     # Admin only
│   ├── ProjectsPage.tsx    # Admin + PM
│   ├── ProjectDetailPage.tsx
│   ├── TasksPage.tsx
│   └── ActivityPage.tsx
├── routes/
│   ├── AppRouter.tsx
│   └── ProtectedRoute.tsx
├── socket/
│   └── socket.client.ts
├── types/
├── styles/                 # Shared CSS variables and base styles
└── main.tsx
```

## Routing

| Path | Page | Roles | Notes |
| ---- | ---- | ----- | ----- |
| `/login` | LoginPage | Public | |
| `/dashboard` | DashboardPage | All authenticated | Role-specific content |
| `/clients` | ClientsPage | Admin | PM has no client management UI |
| `/projects` | ProjectsPage | Admin, PM | Developer has no project pages |
| `/projects/:id` | ProjectDetailPage | Admin, PM | Triggers `presence:join-project` |
| `/tasks` | TasksPage | All | Scoped data per role; filters in URL |
| `/activity` | ActivityPage | All | Role-scoped feed |

`ProtectedRoute` checks authentication (redirect to login if unauthenticated).
Role-based UI hiding (hide buttons, nav items) is **UX only** — backend enforces all permissions.

## State Management

| State | Tool | Notes |
| ----- | ---- | ----- |
| Server data (projects, tasks, etc.) | **TanStack Query** | Caching, refetch, loading/error |
| Auth (user, access token) | **React Context** | In-memory token only |
| Real-time (activity, notifications, presence) | **Socket.IO → Query cache updates** | No polling |
| UI state (modals, forms) | Component `useState` | No global store |

## Authentication Flow

```
App mount → POST /api/auth/refresh (cookie) → store token in AuthContext
Login → POST /api/auth/login → store token → /dashboard
API calls → Authorization: Bearer from memory; withCredentials: true
401 → silent refresh → retry once → logout on failure
Logout → POST /api/auth/logout → clear context → disconnect socket → /login
```

Access token: **memory only**. Refresh token: **HttpOnly cookie only**.

## Real-Time Integration

```typescript
// On connect: catch-up + notification count (server-initiated)
socket.on('activity:event', ...)      // prepend to activity cache
socket.on('activity:catchup', ...)    // merge DB catch-up
socket.on('task:status-changed', ...) // update task in Query cache
socket.on('notification:new', ...)    // prepend to notification list
socket.on('notification:count', ...)  // update badge count
socket.on('presence:global', ...)     // Admin: online user count
socket.on('presence:project', ...)    // Admin/PM: project viewers
```

No `setInterval` polling for live data.

### Project page presence

When Admin/PM opens a project detail page:
```typescript
socket.emit('presence:join-project', { projectId });
// on unmount:
socket.emit('presence:leave-project', { projectId });
```

Developers never join project rooms.

## Task List Filters (Shareable URLs)

Filters stored as URL search params, synced with `GET /api/tasks` query:

```
/tasks?status=IN_PROGRESS&priority=HIGH&dueDateFrom=2026-09-01&dueDateTo=2026-09-30
```

Use `useSearchParams` (React Router) to read/write filters. TanStack Query key includes filter params.

## Notifications UI

- Header notification bell with unread count badge
- Count updated via WebSocket `notification:count` (not polling)
- Dropdown lists recent notifications
- Mark individual read / mark all read via REST; count updates via WebSocket

## Dashboard Pages (per role)

| Role | Content |
| ---- | ------- |
| Admin | Total projects, tasks by status, overdue count, live online-user count (WebSocket) |
| PM | Project count, tasks by priority, upcoming due this week |
| Developer | Assigned tasks table sorted by priority then due date |

## UI Design Guidelines

Plain CSS and reusable components — no UI component library.

| Principle | Guidance |
| --------- | -------- |
| Overall feel | Minimal, professional, information-first |
| Background | Light neutral |
| Surfaces | White cards/panels |
| Borders | Restrained; subtle radius and shadows |
| Accent | Blue/periwinkle for primary actions and active states |
| Typography | Compact, readable hierarchy |

**Avoid:**
- Gradients, glassmorphism, neon/futuristic styling
- Excessive rounded cards, shadows, or animations
- Huge headings
- Generic "AI dashboard" aesthetic

Shared CSS variables in `frontend/src/styles/variables.css` for colors, spacing, typography.

## Environment Variables

| Variable | Purpose |
| -------- | ------- |
| `VITE_API_URL` | Backend REST base URL |
| `VITE_WS_URL` | Socket.IO server URL |

## Development Proxy (optional)

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': 'http://localhost:3000',
    '/socket.io': { target: 'http://localhost:3000', ws: true }
  }
}
```
