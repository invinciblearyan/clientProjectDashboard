# Deployment

## Split Architecture (Required)

A normal Vercel frontend deployment **cannot** host the persistent Socket.IO server or node-cron scheduler. These require an always-on Node.js process.

```
┌──────────────────┐   HTTPS REST    ┌────────────────────────────────┐
│  Vercel          │ ──────────────► │  Railway / Render / Fly.io     │
│  frontend/dist/  │   WSS           │  Express + Socket.IO + cron    │
└──────────────────┘ ──────────────► └───────────────┬────────────────┘
                                                      │ Prisma
                                                      ▼
                                      ┌────────────────────────────────┐
                                      │  Managed PostgreSQL            │
                                      │  (Neon / Supabase / Railway)   │
                                      └────────────────────────────────┘
```

| Component | Host | Why |
| --------- | ---- | --- |
| Frontend (React SPA) | **Vercel** | Static build; CDN; automatic SSL |
| Backend API | **Railway** (or Render/Fly.io) | Persistent Node process |
| Socket.IO | **Same as backend** | Requires persistent WebSocket connections |
| node-cron | **Same as backend** | Requires long-running process |
| PostgreSQL | **External managed DB** | Vercel does not host databases |

## What Vercel Cannot Do for This Project

| Capability | Vercel limitation |
| ---------- | ----------------- |
| Socket.IO WebSocket server | Serverless functions are stateless and short-lived |
| node-cron scheduled jobs | No persistent background process |
| PostgreSQL | Requires external provider |

## Environment Variables

### Frontend (Vercel)

| Variable | Example |
| -------- | ------- |
| `VITE_API_URL` | `https://api.yourapp.railway.app` |
| `VITE_WS_URL` | `https://api.yourapp.railway.app` |

### Backend (Railway or similar)

| Variable | Example |
| -------- | ------- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` |
| `JWT_ACCESS_SECRET` | (generated — never commit) |
| `JWT_REFRESH_SECRET` | (generated — never commit) |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | `https://yourapp.vercel.app` |
| `OVERDUE_CRON_SCHEDULE` | `0 * * * *` |
| `ENABLE_CRON_JOBS` | `true` |

### Root (Docker Compose — local dev only)

See `.env.example` for PostgreSQL credentials.

## Cross-Origin Configuration

Frontend (Vercel) and backend (Railway) are on different domains:

- Backend CORS: `{ origin: CORS_ORIGIN, credentials: true }`
- Frontend HTTP client: `withCredentials: true`
- Refresh cookie: `SameSite=None; Secure=true` in production
- Socket.IO client: `withCredentials: true`

## Deployment Steps

### 1. PostgreSQL
```bash
npm run db:deploy
```

Development seed (`npx prisma db seed`) is for **local use only**. See [Seed Data](./seed-data.md).

### 2. Backend (Railway)
```bash
cd backend && npm run build
# Root directory: backend/
# Release command runs db:deploy (see railway.toml)
# Start: npm start
```

### 3. Frontend (Vercel)
```bash
# Root directory: frontend/
# Build: npm run build; Output: dist/
# vercel.json handles client-side routing
```

## Health Check

`GET /health` — used by hosting platform readiness probes.

## Scaling Note

Single backend instance is sufficient for current load. If scaling horizontally later:
- Add `@socket.io/redis-adapter` for cross-instance events
- Enable sticky sessions on load balancer

## SSL

- Vercel: automatic HTTPS for frontend
- Railway/Render: automatic HTTPS for backend
- WebSocket: use `wss://` in production (`VITE_WS_URL`)
