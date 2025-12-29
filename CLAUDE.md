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

## GPX Plan System - Waypoint Architecture

### Overview

GPX plans support nutrition waypoints with **three distinct types**: spatial (distance-based), temporal single (time-based), and temporal loops (repeating patterns). This architecture allows athletes to plan nutrition both geographically along a route and temporally during training.

### Waypoint Types

#### 1. Spatial Waypoint (Distance-Based)

Waypoints tied to geographic coordinates and distance from start.

```typescript
{
  type: 'spatial',
  latitude: number,
  longitude: number,
  elevation_m?: number,
  distance_from_start_km: number,
  trigger_time_min: null,
  is_repeating: false,
  repeat_config: null,
  // ... nutrition data
}
```

**Use Cases:**
- "Energy gel at km 15 (aid station)"
- "Hydration at mountain summit"
- "Salt caps before descent"

**Visualization:**
- ✅ Interactive map (marker at coordinates)
- ✅ Elevation chart (vertical line at distance)
- ✅ Mini elevation chart (subtle line)
- ✅ Waypoint table ("KM 15.0")

**Creation:**
- Click elevation chart at desired distance
- Manual distance entry via "Nuevo Waypoint" button

---

#### 2. Temporal Waypoint Single (Time-Based)

Waypoints triggered at specific elapsed time, independent of location.

```typescript
{
  type: 'temporal',
  trigger_time_min: number,  // e.g., 60 = minute 60
  latitude: null,
  longitude: null,
  elevation_m: null,
  distance_from_start_km: null,
  is_repeating: false,
  repeat_config: null,
  // ... nutrition data
}
```

**Use Cases:**
- "Energy gel at 60 minutes"
- "Isotonic drink at 2 hours"
- "Caffeine gel at 3 hours"

**Visualization:**
- ❌ NOT shown on map (no coordinates)
- ❌ NOT shown on elevation chart (distance-based)
- ✅ Timeline component (marker at T+60min)
- ✅ Waypoint table ("T+60 min")

**Creation:**
- Manual time entry via "Nuevo Waypoint" → "Tiempo" tab

---

#### 3. Temporal Waypoint Loop (Repeating Pattern)

Waypoints that repeat at regular intervals, ideal for recurring nutrition.

```typescript
{
  type: 'temporal',
  is_repeating: true,
  repeat_config: {
    start_time_min: number,    // e.g., 60 (start at minute 60)
    interval_min: number,       // e.g., 30 (every 30 minutes)
    repetitions: number,        // e.g., 5 (repeat 5 times)
  },
  color: string,  // REQUIRED - hex color for visual distinction
  trigger_time_min: null,
  latitude: null,
  longitude: null,
  // ... nutrition data (same for all repetitions)
}
```

**Use Cases:**
- "Hydration every 20 minutes starting at minute 20" (repeat 10 times)
- "Energy gel every 45 minutes starting at minute 45" (repeat 6 times)
- "Salt cap every hour starting at hour 1" (repeat 4 times)

**Visualization:**
- ❌ NOT shown on map
- ❌ NOT shown on elevation chart
- ✅ Timeline component (multiple markers with same color)
- ✅ Waypoint table (expandable row or multiple rows)

**Loop Expansion Example:**
```typescript
// Input:
{
  repeat_config: { start_time_min: 60, interval_min: 30, repetitions: 5 },
  product_name: "Maurten Gel",
  color: "#3b82f6"
}

// Generates 5 virtual waypoints at:
// T+60min, T+90min, T+120min, T+150min, T+180min
// All with same nutrition data and color
```

**Creation:**
- Manual configuration via "Nuevo Waypoint" → "Repetir (Bucle)" tab
- Includes color picker for visual distinction

---

### Database Schema

**Table:** `gpx_nutrition_waypoints`

**Key Columns:**
```sql
type VARCHAR(20) CHECK (type IN ('spatial', 'temporal')) DEFAULT 'spatial'
is_repeating BOOLEAN DEFAULT false
repeat_config JSONB  -- { start_time_min, interval_min, repetitions }
color VARCHAR(7)  -- Hex color e.g., #FF5733

-- Spatial waypoint fields
latitude DECIMAL(10, 8)
longitude DECIMAL(11, 8)
elevation_m DECIMAL(10, 2)
distance_from_start_km DECIMAL(10, 3)

-- Temporal waypoint fields
trigger_time_min INTEGER

-- Nutrition data (all types)
nutrition_type VARCHAR(50)
product_name VARCHAR(200)
calories INTEGER
carbs DECIMAL(10, 2)
protein DECIMAL(10, 2)
fat DECIMAL(10, 2)
sodium_mg DECIMAL(10, 2)
caffeine_mg DECIMAL(10, 2)
quantity DECIMAL(10, 2)
quantity_unit VARCHAR(50)
notes TEXT
```

**Database Constraints:**

```sql
-- Spatial waypoints MUST have coordinates
CHECK (
  (type = 'spatial' AND latitude IS NOT NULL AND longitude IS NOT NULL AND distance_from_start_km IS NOT NULL)
  OR type = 'temporal'
)

-- Temporal waypoints CANNOT have coordinates
CHECK (
  (type = 'temporal' AND latitude IS NULL AND longitude IS NULL AND distance_from_start_km IS NULL)
  OR type = 'spatial'
)

-- Repeating waypoints MUST have repeat_config
CHECK (
  (is_repeating = true AND repeat_config IS NOT NULL)
  OR is_repeating = false
)

-- Repeating waypoints MUST have color
CHECK (
  (is_repeating = true AND color IS NOT NULL)
  OR is_repeating = false
)
```

**Indexes:**
```sql
CREATE INDEX idx_waypoints_type ON gpx_nutrition_waypoints(plan_id, type);
CREATE INDEX idx_waypoints_repeating ON gpx_nutrition_waypoints(plan_id, is_repeating) WHERE is_repeating = true;
```

---

### TypeScript Type System

**Location:** `src/types/waypoint.ts`

**Type Guards:**
```typescript
isSpatialWaypoint(w: Waypoint): w is SpatialWaypoint
isTemporalWaypoint(w: Waypoint): w is TemporalWaypointSingle | TemporalWaypointLoop
isRepeatingWaypoint(w: Waypoint): w is TemporalWaypointLoop
```

**Helper Functions:**
```typescript
// Expands a temporal loop into virtual waypoints
expandTemporalLoop(loop: TemporalWaypointLoop): Array<{ time: number, ...waypoint }>

// Example:
const loop = {
  repeat_config: { start_time_min: 60, interval_min: 30, repetitions: 5 },
  product_name: "Gel",
  color: "#3b82f6"
};

expandTemporalLoop(loop);
// Returns: [
//   { time: 60, ...loop },
//   { time: 90, ...loop },
//   { time: 120, ...loop },
//   { time: 150, ...loop },
//   { time: 180, ...loop }
// ]
```

---

### Validation (Zod)

**Location:** `src/lib/validations/gpx.ts`

**Discriminated Union Pattern:**
```typescript
export const createWaypointSchema = z.discriminatedUnion('type', [
  createSpatialWaypointSchema,    // type: 'spatial'
  createTemporalWaypointSchema,   // type: 'temporal', is_repeating: false
  createTemporalLoopSchema,       // type: 'temporal', is_repeating: true
]);
```

**Key Validations:**
- Spatial: Requires lat (-90 to 90), lon (-180 to 180), distance_from_start_km
- Temporal: Requires trigger_time_min (0 to 1440 minutes = 24 hours)
- Loop: Requires repeat_config + color (hex format)
- Mutual exclusivity: Spatial fields forbidden for temporal, vice versa

---

### API Endpoints

**Base:** `/api/gpx-plans/[id]/waypoints`

**POST - Create Waypoint**
```typescript
// Request body (discriminated by type)
{
  type: 'spatial' | 'temporal',
  is_repeating?: boolean,
  // ... type-specific fields
}

// Validates against createWaypointSchema
// Returns created waypoint with ID
```

**PATCH - Update Waypoint**
```typescript
// Request body
{
  waypoint_id: string,
  // ... partial update fields (cannot change type)
}

// Validates against updateWaypointSchema
```

**DELETE - Remove Waypoint**
```typescript
// Query param: waypoint_id
// Soft delete or hard delete based on requirements
```

**GET - List Waypoints** (existing)
```typescript
// Returns all waypoints for plan_id
// Frontend filters by type for visualization
```

---

### UI Components

**1. WaypointEditorDialog** (`src/components/gpx/WaypointEditorDialog.tsx`)

**Tabs:**
- **Distancia** - Create spatial waypoint (manual km entry)
- **Tiempo** - Create temporal single waypoint (manual minute entry)
- **Repetir (Bucle)** - Create temporal loop (start/interval/count + color picker)

**Features:**
- Distance tab: Pre-filled if clicked from elevation chart
- Loop tab: Preview showing expanded times before creation
- Color picker: Visual selector for loop colors
- Validation: Real-time feedback on invalid inputs

---

**2. TemporalTimeline** (`src/components/gpx/TemporalTimeline.tsx` - NEW)

**Purpose:** Display temporal waypoints on independent horizontal timeline

**Features:**
- Horizontal timeline (0 to totalDuration minutes)
- Markers for temporal single waypoints (default gray)
- Markers for expanded loops (custom color from loop config)
- Hover labels showing time and product
- Click handler to open waypoint details

**Algorithm:**
```typescript
1. Filter waypoints → keep only temporal (type === 'temporal')
2. For each temporal waypoint:
   - If repeating: expandTemporalLoop() → generate N markers
   - If single: create 1 marker at trigger_time_min
3. Sort markers by time ascending
4. Position markers at (time / totalDuration) * 100% from left
```

---

**3. InteractiveMap** (`src/components/gpx/InteractiveMap.tsx`)

**New Feature:** Display spatial waypoint markers

```typescript
// Filter waypoints
const spatialWaypoints = waypoints.filter(isSpatialWaypoint);

// Render markers
spatialWaypoints.map(wp => (
  <Marker position={[wp.latitude, wp.longitude]}>
    <Popup>
      {wp.product_name || wp.nutrition_type}
      <br />
      KM {wp.distance_from_start_km.toFixed(1)}
    </Popup>
  </Marker>
))
```

---

**4. ElevationChart & MiniElevationChart**

**Modification:** Filter to show only spatial waypoints

```typescript
// BEFORE: Show all waypoints
waypoints.map(wp => <ReferenceLine x={wp.distance_from_start_km} />)

// AFTER: Show only spatial
waypoints.filter(isSpatialWaypoint).map(wp => (
  <ReferenceLine x={wp.distance_from_start_km} />
))
```

---

### User Flows

**Creating Spatial Waypoint (Distance-Based):**
1. User clicks elevation chart at km 15
2. WaypointEditorDialog opens with "Distancia" tab active
3. Distance field pre-filled with 15.0 km
4. User selects nutrition type (e.g., "Energy Gel")
5. Fills product name, calories, etc.
6. Clicks "Crear"
7. API validates as createSpatialWaypointSchema
8. Backend finds closest track point coordinates
9. Waypoint saved with coordinates
10. UI updates: marker on map, line on elevation chart

**Creating Temporal Single Waypoint (Time-Based):**
1. User clicks "Nuevo Waypoint"
2. WaypointEditorDialog opens
3. User switches to "Tiempo" tab
4. Enters trigger time (e.g., 90 minutes)
5. Selects nutrition type (e.g., "Hydration")
6. Fills product details
7. Clicks "Crear"
8. API validates as createTemporalWaypointSchema
9. Waypoint saved without coordinates
10. UI updates: marker on timeline at T+90min

**Creating Temporal Loop (Repeating Pattern):**
1. User clicks "Nuevo Waypoint"
2. WaypointEditorDialog opens
3. User switches to "Repetir (Bucle)" tab
4. Enters start time: 60 minutes
5. Enters interval: 30 minutes
6. Enters repetitions: 5
7. Chooses color via color picker: #FF5733 (orange)
8. Selects nutrition type (e.g., "Isotonic Drink")
9. Preview shows: "Se crearán 5 waypoints en los minutos: 60, 90, 120, 150, 180"
10. Clicks "Crear"
11. API validates as createTemporalLoopSchema (requires color)
12. Single record saved with repeat_config JSON
13. UI updates: 5 orange markers on timeline at calculated times

---

### Testing Strategy

**Unit Tests:**
- Type guards (isSpatialWaypoint, isTemporalWaypoint, isRepeatingWaypoint)
- expandTemporalLoop helper (various configs)
- Zod schema validation (all three types + invalid cases)

**Integration Tests:**
- POST /api/gpx-plans/[id]/waypoints (all three types)
- PATCH endpoint (update fields, prevent type change)
- DELETE endpoint
- Database constraints enforcement

**Component Tests:**
- WaypointEditorDialog (tab switching, form validation)
- TemporalTimeline (marker positioning, loop expansion)
- InteractiveMap (spatial waypoint markers)

**E2E Tests:**
- Full flow: Create spatial → appears on map + chart
- Full flow: Create temporal single → appears on timeline
- Full flow: Create loop → multiple markers on timeline
- Edit waypoint → updates UI
- Delete waypoint → removes from UI

---

### Migration Checklist

When deploying waypoint system:

1. ✅ Run SQL migration (add columns + constraints)
2. ✅ Update existing waypoints: SET type = 'spatial'
3. ✅ Verify database constraints active
4. ✅ Deploy backend API changes (POST/PATCH/DELETE)
5. ✅ Deploy TypeScript types and helpers
6. ✅ Deploy UI components (Timeline, updated Dialog, Map markers)
7. ✅ Run integration tests
8. ✅ Monitor for constraint violations in logs

---

### Future Enhancements

**Potential Features:**
- Auto-calculate temporal waypoints from pace + distance
- Export waypoints to Garmin/Wahoo device formats
- Waypoint templates library (common nutrition strategies)
- Distance-based loops (every 5km for entire route)
- Conditional waypoints (if weather > 25°C → extra hydration)
- Waypoint sharing between plans
- Analytics: Actual vs planned nutrition compliance
