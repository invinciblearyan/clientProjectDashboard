# Development Seed Data

Seed script location: `backend/prisma/seed.ts`

Run via:
```bash
npx prisma db seed
```

## Entity Counts

| Entity | Count | Notes |
| ------ | ----- | ----- |
| Admin | 1 | |
| Project Managers | 2 | |
| Developers | 4 | |
| Clients | ≥ 3 | Admin-managed records |
| Projects | ≥ 3 | Distributed across PMs and clients |
| Tasks per project | ≥ 5 | Various statuses including `IN_REVIEW` |
| Overdue tasks | ≥ 2 | `dueDate` in past, `isOverdue = true`, not `DONE` |
| ActivityLog entries | Pre-existing | Status-change records with `previousStatus`/`newStatus` |

## Development-Only User Credentials

These credentials are **for local development and testing only**. They must **never** be used in production or committed as production secrets.

| Role | Name (seed) | Email | Password |
| ---- | ----------- | ----- | -------- |
| Admin | Admin User | `admin@example.com` | `Admin123!Dev` |
| PM 1 | PM One | `pm1@example.com` | `PM123!Dev` |
| PM 2 | PM Two | `pm2@example.com` | `PM456!Dev` |
| Developer 1 | Dev One | `dev1@example.com` | `Dev123!Dev` |
| Developer 2 | Dev Two | `dev2@example.com` | `Dev456!Dev` |
| Developer 3 | Dev Three | `dev3@example.com` | `Dev789!Dev` |
| Developer 4 | Dev Four | `dev4@example.com` | `Dev012!Dev` |

### Password storage rules

- Seed script hashes passwords with **bcrypt** before inserting into `User.passwordHash`
- **Never** store plaintext passwords in the database
- **Never** hardcode plaintext passwords outside the seed script
- Production user passwords are created by Admin via API and hashed at runtime — not from this list

### Credential safety rules

| Rule | Requirement |
| ---- | ----------- |
| Development only | These accounts exist only in seeded local/dev databases |
| No production reuse | Do not use these emails or passwords in production |
| No real passwords | Do not substitute real personal or production passwords |
| No `.env` secrets | Do not commit `.env` files; production secrets come from environment/secrets manager |
| README documentation | Root `README.md` must list these dev credentials with a production warning |

## Implementation Notes

```typescript
// backend/prisma/seed.ts (pseudocode)
const adminPasswordHash = await bcrypt.hash('Admin123!Dev', 12);
await prisma.user.create({
  data: {
    email: 'admin@example.com',
    passwordHash: adminPasswordHash,
    name: 'Admin User',
    role: 'ADMIN',
  },
});
// ... repeat for all seed users with bcrypt hashes
```

The seed script should be idempotent or run against a fresh database via `prisma migrate reset` in development.

## Production

Production deployments:
- Do **not** run seed with these credentials against production databases
- Admin accounts in production are created manually or via a one-time setup with secrets from environment variables
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `DATABASE_URL` must come from the hosting platform's secrets configuration
