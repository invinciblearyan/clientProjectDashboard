# Validation & Error Handling

## Validation — Zod

All API inputs validated server-side before reaching services.

```
backend/src/validators/
├── auth.validator.ts
├── user.validator.ts
├── client.validator.ts
├── project.validator.ts
├── task.validator.ts
├── activity.validator.ts
└── notification.validator.ts
```

### Flow

```
Request → validate(schema) middleware → controller → service → repository
```

Validators check type, format, length, and required fields. Authorization is the service layer's responsibility.

### Task filter query schema example

```typescript
export const listTasksQuerySchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
  projectId: z.string().cuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
```

## Structured API Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ],
    "requestId": "req_abc123"
  }
}
```

### Error Codes & HTTP Status

| Code | HTTP | When |
| ---- | ---- | ---- |
| `VALIDATION_ERROR` | 400 | Zod validation failure |
| `UNAUTHORIZED` | 401 | Missing, expired, or invalid token |
| `FORBIDDEN` | 403 | Authenticated but action not permitted |
| `NOT_FOUND` | 404 | Resource not found, or intentionally hidden |
| `CONFLICT` | 409 | Duplicate email, invalid state transition |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

### Authentication vs Authorization

| Situation | Status |
| --------- | ------ |
| No `Authorization` header | 401 |
| Expired/invalid access JWT | 401 |
| Invalid/revoked refresh token | 401 |
| Developer calls `POST /api/projects` | 403 |
| Developer updates non-status field on task | 403 |
| Developer requests another developer's task ID | 404 (intentional — hide existence) |
| PM requests another PM's project | 404 (intentional — hide existence) |

Do not use 404 for all authorization failures. Use 403 when the user is authenticated and the action class is known but denied.

### Production Safety

- 500 responses: generic message only — **never expose stack traces**
- 400 responses: include field-level `details`
- `requestId` on all errors for log correlation

## Success Response Convention

```json
{ "data": { ... } }
{ "data": [ ... ], "pagination": { "page": 1, "limit": 20, "total": 87, "totalPages": 5 } }
{ "message": "Logged out successfully" }
```
