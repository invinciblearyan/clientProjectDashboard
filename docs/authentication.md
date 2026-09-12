# Authentication Architecture

JWT-based authentication with refresh token rotation via HttpOnly cookies.

No public/self-registration. Admin creates all user accounts.

## Token Strategy

| Token | Storage | Lifetime | Transport |
| ----- | ------- | -------- | --------- |
| **Access JWT** | In-memory on frontend (React Context) | Short (e.g., 15 min) | `Authorization: Bearer <token>` header |
| **Refresh JWT** | HttpOnly cookie | Long (e.g., 7 days) | `Set-Cookie` / automatic browser send |

### Hard constraints

- Refresh token in HttpOnly cookie only — not `localStorage`
- Access token in memory only — not `localStorage` or `sessionStorage`
- Server-side revocation via `RefreshToken` table

## JWT Payload (Access Token)

```json
{
  "sub": "<userId>",
  "email": "user@example.com",
  "role": "PROJECT_MANAGER",
  "iat": 1234567890,
  "exp": 1234568790
}
```

Signed with `JWT_ACCESS_SECRET` from environment. No sensitive data in payload.

## Authentication vs Authorization

| Concern | HTTP Status | When |
| ------- | ----------- | ---- |
| **Authentication** | **401 Unauthorized** | Missing, expired, or invalid access/refresh token |
| **Authorization** | **403 Forbidden** | Valid token but insufficient role or action not permitted |
| **Hidden resource** | **404 Not Found** | Intentionally used where hiding resource existence is appropriate (see [RBAC](./rbac.md)) |

Do not return 401 for permission failures. Do not blanket-map all authorization failures to 404.

## Refresh Token Flow

```
Login (POST /api/auth/login)
  → validate credentials (401 if invalid)
  → create RefreshToken record (store SHA-256 hash)
  → issue access JWT + refresh JWT
  → Set-Cookie: refreshToken=<jwt>; HttpOnly; Secure; SameSite; Path=/api/auth
  → return { accessToken, user } in JSON body

API Request
  → Authorization: Bearer <accessJWT>
  → authenticate middleware verifies signature + expiry (401 if invalid)

Access Token Expired
  → POST /api/auth/refresh (cookie sent automatically)
  → verify refresh JWT signature (401 if invalid)
  → lookup tokenHash in RefreshToken table (not revoked, not expired)
  → revoke old refresh token (set revokedAt)
  → create new RefreshToken record (rotation)
  → issue new access JWT + new refresh JWT
  → Set-Cookie with new refresh token

Logout (POST /api/auth/logout)
  → revoke current RefreshToken record
  → Clear refresh cookie (Max-Age=0)
  → frontend clears in-memory access token
  → disconnect Socket.IO
```

## Token Rotation & Reuse Detection

| Event | Action |
| ----- | ------ |
| Refresh | Old token revoked; new token issued; `replacedByTokenId` links chain |
| Logout | Current token revoked; cookie cleared |
| Reuse of revoked refresh token | Revoke **all** refresh tokens for that user; force re-login (401) |
| Password change | Revoke all refresh tokens for user |
| Account deactivated | Revoke all refresh tokens; reject login (401) |

## Cookie Configuration

```typescript
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', // 'none' if cross-origin with Vercel
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000
}
```

## Password Storage

- bcrypt with cost factor 12
- Stored in `User.passwordHash`
- Never returned in API responses

## Environment Variables

| Variable | Purpose |
| -------- | ------- |
| `JWT_ACCESS_SECRET` | Sign/verify access tokens |
| `JWT_REFRESH_SECRET` | Sign/verify refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | e.g., `15m` |
| `JWT_REFRESH_EXPIRES_IN` | e.g., `7d` |

All loaded via `backend/src/config/env.ts`. No hardcoded secrets.

## Frontend Token Handling

```
App mount
  → POST /api/auth/refresh (cookie auto-sent)
  → on success: store accessToken in AuthContext (memory)
  → on failure: user = null, show login

Login
  → POST /api/auth/login
  → store accessToken in AuthContext
  → redirect to /dashboard

API calls
  → attach Authorization: Bearer <accessToken> from memory

401 response
  → attempt silent refresh via POST /api/auth/refresh
  → on success: retry original request
  → on failure: clear auth state, redirect to login

Page refresh
  → access token lost (in-memory)
  → boot refresh flow restores session from cookie
```

## Socket.IO Authentication

```typescript
const socket = io(BACKEND_URL, {
  auth: { token: accessToken },
  withCredentials: true
});
```

Server middleware verifies access JWT on connection. Invalid token → connection rejected (not silently anonymous).

On access token expiry: refresh token, then reconnect socket with new access token.

## User Provisioning

| Endpoint | Who can call | Purpose |
| -------- | ------------ | ------- |
| `POST /api/users` | Admin | Create user with role |
| `POST /api/auth/login` | Anyone with credentials | Login only |

No `POST /api/auth/register` public endpoint.

## Implementation Locations

| Concern | File |
| ------- | ---- |
| Login / refresh / logout | `backend/src/controllers/auth.controller.ts` |
| User creation (Admin) | `backend/src/controllers/user.controller.ts` |
| Token issuance / rotation | `backend/src/services/auth.service.ts` |
| RefreshToken persistence | `backend/src/repositories/refresh-token.repository.ts` |
| JWT middleware | `backend/src/middleware/authenticate.ts` |
| Cookie helpers | `backend/src/utils/cookie.ts` |
