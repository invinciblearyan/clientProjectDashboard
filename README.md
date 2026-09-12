# Client Project Dashboard

Full-stack dashboard for managing client projects, tasks, and team workflows. Supports three roles (Admin, Project Manager, Developer) with REST APIs, Socket.IO realtime updates, notifications, and scheduled overdue-task processing.

## Features

- JWT auth with refresh token rotation (access token in memory, refresh in HttpOnly cookie)
- Role-based access on REST and WebSocket layers
- Project and task management with activity audit trail
- Live updates for task status, activity feed, notifications, and admin presence
- Role-specific dashboards and shareable task filter URLs
- Background cron job for overdue task flagging

## Stack

| Layer | Technologies |
| ----- | ------------ |
| Frontend | React, TypeScript, Vite, TanStack Query, React Router, Socket.IO client |
| Backend | Node.js, Express, TypeScript, Prisma, PostgreSQL, Socket.IO, node-cron, Zod |

Backend layout: `routes → controllers → services → repositories → Prisma`.

## Local setup

Docker is the preferred way to run PostgreSQL locally.

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### 1. Start PostgreSQL (Docker)

From the repository root:

```bash
cp .env.example .env
# Optional: edit POSTGRES_PASSWORD in .env
docker compose up -d
```

This starts PostgreSQL on port `5432` using the credentials in `.env`.

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Set in `backend/.env`:

- `DATABASE_URL` — e.g. `postgresql://postgres:postgres@localhost:5432/client_project_dashboard`
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` — at least 32 characters each

Then:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Backend runs at **http://localhost:3000** (`GET /health` for readiness).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**. Vite proxies `/api` and `/socket.io` to the backend, so no frontend `.env` is required for the default local setup.

### Seed users (development only)

| Role | Email | Password |
| ---- | ----- | -------- |
| Admin | `admin@example.com` | `Admin123!Dev` |
| PM | `pm1@example.com` | `PM123!Dev` |
| Developer | `dev1@example.com` | `Dev123!Dev` |

Full seed list: [`docs/seed-data.md`](docs/seed-data.md).

## Database schema

PostgreSQL schema is defined in [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).

### Entities

| Model | Purpose |
| ----- | ------- |
| **User** | Accounts with role (`ADMIN`, `PROJECT_MANAGER`, `DEVELOPER`) |
| **Client** | Customer records (Admin-managed) |
| **Project** | Belongs to a client; `createdById` anchors PM ownership |
| **Task** | Belongs to a project; optional assignee; status, priority, due date, `isOverdue` |
| **ActivityLog** | Append-only audit trail (user and system events) |
| **Notification** | Per-user inbox with read state |
| **RefreshToken** | Hashed refresh tokens with rotation and revocation |

### Relationships

- `Project.clientId` → `Client.id`
- `Project.createdById` → `User.id` (PM ownership)
- `Task.projectId` → `Project.id`
- `Task.assigneeId` → `User.id` (developer access anchor)
- `ActivityLog` → optional `User`, `Project`, `Task`, `Client`
- `Notification.userId` → `User.id`
- `RefreshToken.userId` → `User.id`

### ER diagram

```mermaid
erDiagram
  User ||--o{ Project : creates
  User ||--o{ Task : assigns
  User ||--o{ RefreshToken : has
  User ||--o{ Notification : receives
  User ||--o{ ActivityLog : acts
  Client ||--o{ Project : owns
  Project ||--o{ Task : contains
  Project ||--o{ ActivityLog : logs
  Project ||--o{ Notification : references
  Task ||--o{ ActivityLog : logs
  Task ||--o{ Notification : references
```

Extended schema notes: [`docs/database-design.md`](docs/database-design.md).

## Architectural decisions

| Area | Choice | Rationale |
| ---- | ------ | --------- |
| **WebSocket library** | Socket.IO | Built-in auth handshake, named rooms, reconnect handling, and transport fallbacks. Avoids rebuilding room routing, heartbeat, and catch-up plumbing on raw WebSockets. |
| **Background jobs** | `node-cron` in-process | Overdue task flagging runs in the same persistent Node process as the API. No separate queue/worker service for this scope; the job reads/writes via Prisma on a schedule. |
| **Access token storage** | In-memory (React Context) | Short-lived JWT kept out of `localStorage`/`sessionStorage` to reduce XSS exfiltration risk. |
| **Refresh token storage** | HttpOnly cookie | Not accessible to JavaScript; sent automatically on refresh; supports server-side rotation and revocation via the `RefreshToken` table. |
| **Realtime data source** | PostgreSQL + Socket.IO | Activity and notifications are persisted first; reconnect catch-up loads the last 20 authorized rows from the database, not from socket memory. |
| **API layering** | Express + services + repositories | Keeps authorization and business rules out of route handlers; Prisma stays in repositories. |

Further detail: [`docs/websocket-architecture.md`](docs/websocket-architecture.md), [`docs/authentication.md`](docs/authentication.md), [`docs/background-jobs.md`](docs/background-jobs.md).

## Known limitations

- **Activity feed pagination** — REST supports pagination; the UI loads the first page and prepends live/catch-up events.
- **Single Socket.IO instance** — Presence and room membership are in-memory. Horizontal scaling would need a Redis adapter and sticky sessions.
- **Single backend instance** — The overdue cron job has no distributed lock; only one scheduler should run in production.
- **Developer activity scope** — Developers see project activity only for projects where they have an assigned task.
- **Split deployment required** — Frontend static hosting cannot run Socket.IO or cron; the backend must be a persistent Node process.

## Testing

```bash
cd frontend && npm test && npm run build
cd backend && npm test && npm run build
```

See [`docs/testing-strategy.md`](docs/testing-strategy.md) for coverage details.

## Deployment

Live deployment uses **Vercel** (frontend) + **Railway** (backend, PostgreSQL, Socket.IO, cron).

| Service | URL |
| ------- | --- |
| **Frontend** | https://frontend-topaz-phi-91.vercel.app |
| **Backend API** | https://backend-production-85f54.up.railway.app |
| **Health check** | https://backend-production-85f54.up.railway.app/health |
| **GitHub** | https://github.com/invinciblearyan/clientProjectDashboard |

Backend root directory on Railway: `backend`. Frontend root directory on Vercel: `frontend`.

Do **not** run `npm run db:seed` in production. Production users were bootstrapped separately from local dev seed data.

### Demo access (production)

Use these accounts on the **live site** for review and testing:

| Role | Email | Password |
| ---- | ----- | -------- |
| Admin | `admin@clientprojectdashboard.com` | `eucwENaX184gZvRcEJWx` |
| Project Manager | `pm@clientprojectdashboard.com` | `PmDemo2026!Secure` |
| Developer | `dev@clientprojectdashboard.com` | `DevDemo2026!Secure` |

**Suggested reviewer flow**

1. Log in as **Admin** — create a client, view global dashboard and presence.
2. Log in as **PM** — create a project (needs a client first; Admin can create one), add tasks, assign the developer.
3. Log in as **Developer** — view assigned tasks only, update task status, confirm notifications and live activity.

Local development still uses `npm run db:seed` and the separate dev accounts in the table below.

Split deployment architecture and env var details: [`docs/deployment.md`](docs/deployment.md).

## Documentation

| Document | Topic |
| -------- | ----- |
| [`docs/authentication.md`](docs/authentication.md) | JWT and refresh flow |
| [`docs/rbac.md`](docs/rbac.md) | Role permissions |
| [`docs/websocket-architecture.md`](docs/websocket-architecture.md) | Realtime events and rooms |
| [`docs/api-design.md`](docs/api-design.md) | REST endpoints |
| [`docs/database-design.md`](docs/database-design.md) | Schema and indexes |
| [`docs/background-jobs.md`](docs/background-jobs.md) | Overdue task cron |
| [`docs/deployment.md`](docs/deployment.md) | Production setup |
