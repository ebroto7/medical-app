# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Dev server with Turbopack
npm run build        # Production build
npm run start        # Run production build
npm run lint         # ESLint
npm run test         # Run Vitest unit tests
npm run test:watch   # Vitest watch mode
npm run test:e2e     # Playwright E2E tests
npm run db:types     # Generate TypeScript types from Supabase schema
```

## Architecture Overview

NutriDiary is a nutrition tracking app connecting patients with nutritionists. Built with **Next.js 16** (App Router) + Supabase + TypeScript.

### Authentication Flow (Next.js 16 Pattern)

```
Browser (AuthContext)     Proxy (Next.js 16)     Server Components       API Routes
       │                      │                        │                      │
       ├─ createBrowserClient │                        │                      │
       │                      │                        │                      │
       │  GET /dashboard/*    │                        │                      │
       │ ────────────────────>│                        │                      │
       │                      ├─ refreshSession()      │                      │
       │                      │   (cookie refresh)     │                      │
       │                      ├───────────────────────>│                      │
       │                      │                        ├─ requirePageAuth()   │
       │                      │                        ├─ requirePageRole()   │
       │                      │                        │   (server redirect)  │
       │                      │                        │                      │
       │  GET /api/*          │                        │                      │
       │ ───────────────────────────────────────────────────────────────────>│
       │                      │                        │                      ├─ requireAuth()
       │                      │                        │                      ├─ requireRole()
```

**Key Components**:

- **Proxy** (`src/proxy.ts`): Next.js 16 lightweight request interceptor - only handles session refresh (replaces traditional middleware)
- **Session Helpers** (`src/utils/supabase/session.ts`): Cookie propagation and token refresh utilities
- **Page Auth** (`src/lib/auth/page-auth.ts`): Server Component auth guards with redirect logic
- **AuthContext** (`src/contexts/AuthContext.tsx`): Client-side auth state via `onAuthStateChange` with timeout recovery
- **API helpers** (`src/lib/auth/api-helpers.ts`): Reusable auth decorators for API routes

**Why This Architecture (Next.js 16)**:
- Traditional middleware is deprecated in Next.js 16
- Proxy handles only session refresh (fast, runs on Edge)
- Server Components handle auth/role validation with server-side redirects
- No flash of unauthorized content (redirect happens before render)

### API Route Pattern (Security-First)

All API routes follow this structure with security best practices:

```typescript
import { requireAuth, requireRole } from "@/lib/auth/api-helpers";
import { AuthenticationError, RoleError } from "@/lib/auth/errors";
import { rateLimit } from "@/lib/rate-limit";
import { auditSuccess } from "@/services/audit.service";
import { someSchema } from "@/lib/validations/...";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    // 1. Rate Limiting
    const rateLimitResult = rateLimit(request, 'api'); // 'strict' | 'auth' | 'api'
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // 2. Authentication
    const user = await requireAuth();
    await requireRole(user.id, ["nutritionist"]); // optional

    // 3. Validation (Zod)
    const body = await request.json();
    const data = someSchema.parse(body);

    // 4. Database Query
    const supabase = await createClient();
    const { data: result, error } = await supabase.from("table")...

    if (error) {
      logger.error({ error, userId: user.id }, 'Database operation failed');
      return Response.json({ error: "Operation failed" }, { status: 500 });
    }

    // 5. Audit Log (for sensitive operations)
    await auditSuccess(
      request,
      user.id,
      "resource.action",
      "resource_type",
      result.id,
      { metadata: "any" }
    );

    // 6. Response
    return Response.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof RoleError) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    logger.error({ error }, "Unexpected error in API route");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Security Checklist for API Routes**:
- ✅ Rate limiting on ALL endpoints (strict for sensitive ops)
- ✅ Authentication via `requireAuth()`
- ✅ Authorization via `requireRole()` or `canAccessPatientData()`
- ✅ Zod validation for all inputs
- ✅ Structured logging with Pino (never console.error in production)
- ✅ Audit logging for sensitive operations
- ✅ Sanitized error messages (no PII, no DB details)
- ✅ No SQL string interpolation (use parameterized queries)

### Authorization Helpers

```typescript
requireAuth()                              // Returns user or throws AuthenticationError
requireRole(userId, ["patient"])           // Checks role in profiles table
requireOwnership(userId, resourceOwnerId)  // Verifies resource ownership
canAccessPatientData(userId, patientId)    // True if user is patient or connected nutritionist
```

### Supabase Clients

- `src/utils/supabase/server.ts` - Server client for API routes and Server Components (uses cookies)
- `src/utils/supabase/client.ts` - Browser client for Client Components
- `src/utils/supabase/session.ts` - Session refresh helpers for proxy.ts (cookie propagation)

### Zod Validation Schemas

Located in `src/lib/validations/`:
- `nutrition.ts` - Entry schemas (date YYYY-MM-DD, time HH:MM, mealType enum)
- `training.ts` - Session schemas (type enum: cardio, strength, flexibility, hiit, yoga, other)
- `comments.ts` - Nutritionist comment schemas
- `auth.ts` - Password policy (min 12 chars, uppercase, lowercase, number, special char)

## Security Infrastructure

### Rate Limiting

**Two implementations available**:

1. **In-Memory Rate Limiter** (`src/lib/rate-limit.ts`)
   - For local development
   - Three tiers: `strict` (3/min), `auth` (5/min), `api` (100/min)
   - Returns headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

2. **Distributed Rate Limiter** (`src/lib/rate-limit-distributed.ts`) ⭐
   - **Production-ready** with Upstash Redis
   - Sliding window algorithm for accuracy
   - Graceful fallback to in-memory if Upstash not configured
   - Analytics enabled for monitoring

**Usage**:
```typescript
import { rateLimit } from "@/lib/rate-limit";

const rateLimitResult = rateLimit(request, 'strict');
if (!rateLimitResult.success) {
  return Response.json(
    { error: 'Rate limit exceeded' },
    { status: 429, headers: rateLimitResult.headers }
  );
}
```

**Environment variables** (for distributed):
```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### CSRF Protection

**Module**: `src/lib/csrf.ts`

**Features**:
- Cryptographically secure token generation (32 bytes)
- Constant-time comparison (prevents timing attacks)
- Selective protection (DELETE + sensitive POST endpoints)
- Header: `x-csrf-token`

**Functions**:
```typescript
generateCSRFToken()           // Generate secure token
verifyCSRFToken(req, token)   // Verify with timing-safe comparison
requiresCSRFProtection(req)   // Check if endpoint needs protection
```

**Protected endpoints**:
- All `DELETE` requests
- `/api/nutrition/disconnect`
- `/api/nutrition/accept-request`
- `/api/nutrition/reject-request`

### Audit Logging

**Service**: `src/services/audit.service.ts`
**Table**: `audit_log` (see migration `20241224000003_audit_log.sql`)

**Schema**:
```typescript
{
  id: UUID,
  user_id: UUID,
  action: AuditAction,         // "user.signup", "connection.disconnect", etc.
  resource_type: string,       // "user", "meal_plan", "connection"
  resource_id?: UUID,
  details?: JSONB,             // Flexible metadata
  ip_address: string,
  user_agent: string,
  created_at: timestamptz
}
```

**Audit Actions** (20+ types):
```typescript
// Authentication
"user.signup" | "user.login" | "user.logout"

// Connections
"connection.request" | "connection.accept" | "connection.reject" | "connection.disconnect"

// Meal Plans
"meal_plan.create" | "meal_plan.update" | "meal_plan.delete"

// Entries & Sessions
"entry.create" | "entry.update" | "entry.delete"
"session.create" | "session.update" | "session.delete"

// Security Events
"security.suspicious_activity" | "security.potential_attack" |
"security.unauthorized_access" | "security.rate_limit_exceeded"
```

**Usage**:
```typescript
import { auditSuccess, getClientInfo } from "@/services/audit.service";

// After successful operation
await auditSuccess(
  request,
  user.id,
  "meal_plan.delete",
  "meal_plan",
  planId,
  { patientId }
);

// For manual logging
const clientInfo = getClientInfo(request);
await createAuditLog({
  userId: user.id,
  action: "security.suspicious_activity",
  resourceType: "security_event",
  details: { reason: "Multiple failed attempts" },
  ...clientInfo
});
```

**Features**:
- ✅ Non-blocking (errors logged, don't break app)
- ✅ Auto IP and User-Agent extraction
- ✅ JSONB for flexible metadata
- ✅ RLS policies (users can view own logs)
- ✅ Indexed for fast queries (user_id, action, created_at, resource)

### Structured Logging

**Logger**: `src/lib/logger.ts` (Pino)

**Features**:
- Automatic PII redaction (email, password, tokens, auth headers)
- Pretty printing in development
- JSON format in production
- Configurable log level via `LOG_LEVEL` env var

**Usage**:
```typescript
import { logger } from "@/lib/logger";

// ❌ NEVER use console.error in production
console.error("Error:", error);

// ✅ Use structured logging
logger.error({ error, userId }, "Database operation failed");
logger.info({ userId, count }, "Nutrition entries retrieved");
logger.warn({ userId, entryId }, "Unauthorized access attempt");
```

### Security Headers

**Configuration**: `next.config.ts`

**Headers implemented**:
- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- `Strict-Transport-Security` - Force HTTPS
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` - Disable camera, microphone, geolocation
- `Content-Security-Policy` - Restrict resource loading

### Password Policy

**Schema**: `src/lib/validation/auth.ts`

**Requirements**:
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### File Upload Security

**Endpoint**: `/api/nutrition/upload`

**Protections**:
- ✅ Rate limiting (strict: 3/min)
- ✅ File size limit (10MB via Next.js config)
- ✅ MIME type validation (JPEG, PNG, WebP only)
- ✅ Magic number verification (file content matches declared type)
- ✅ User-scoped storage paths (`{userId}/{filename}`)

### Row Level Security (RLS)

**All tables have RLS enabled** with policies for:
- User can view/edit own data
- Nutritionists can view connected patients' data
- Audit logs visible to owner (and admins when implemented)

**Migrations**:
- `20241224000001_core_tables_rls.sql` - All core tables
- `20241224000002_storage_policies.sql` - Storage bucket policies
- `20241224000003_audit_log.sql` - Audit logging table

## Key Directories

```
src/
├── app/api/              # 31 API routes (all with rate limiting + auth)
├── services/
│   ├── auth/             # SOLID auth services (AuthService, RoleService, AuthorizationService)
│   └── audit.service.ts  # Centralized audit logging
├── lib/
│   ├── auth/             # API helpers, error classes, constants
│   ├── validations/      # Zod schemas (nutrition, training, auth)
│   ├── rate-limit.ts     # In-memory rate limiter (dev)
│   ├── rate-limit-distributed.ts  # Upstash Redis rate limiter (prod)
│   ├── csrf.ts           # CSRF protection utilities
│   ├── logger.ts         # Pino structured logger with PII redaction
│   └── security-monitoring.ts  # Security event detection (future)
├── contexts/             # AuthContext with timeout recovery
├── components/ui/        # shadcn/ui components
└── types/database.ts     # Supabase generated types
```

## Database Schema (Key Tables)

**Core Tables**:
- `profiles` - User profiles with role (patient | nutritionist)
- `nutrition_entries` - Food diary entries
- `nutrition_images` - Entry photos (storage_path references Supabase Storage)
- `training_sessions` - Exercise logs
- `patient_nutritionist_connections` - Links patients to nutritionists
- `nutritionist_requests` - Connection requests (pending | accepted | rejected)
- `nutritionist_comments` - Feedback on entries/sessions
- `meal_plans` - Nutritionist-created meal plans (weekly or situational)
- `saved_meals` - User's favorite meals for quick entry
- `notifications` - In-app notifications

**Security Tables**:
- `audit_log` - Comprehensive audit trail (user actions, IP, user-agent, JSONB metadata)

**All tables have Row Level Security (RLS) enabled** - See migrations folder

## Roles

- **patient**: Creates nutrition entries, training sessions; can have one nutritionist
- **nutritionist**: Views connected patients' data, adds comments

## UI Stack

- shadcn/ui components in `src/components/ui/`
- Tailwind CSS with CSS variables for theming
- GSAP + Lenis for animations
