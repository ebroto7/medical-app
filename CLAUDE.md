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

### API Route Pattern

All API routes follow this structure:

```typescript
import { requireAuth, requireRole } from "@/lib/auth/api-helpers";
import { AuthenticationError, RoleError } from "@/lib/auth/errors";
import { someSchema } from "@/lib/validations/...";
import { ZodError } from "zod";

export async function POST(request: Request) {
  try {
    // 1. Auth
    const user = await requireAuth();
    await requireRole(user.id, ["nutritionist"]); // optional

    // 2. Validate
    const body = await request.json();
    const data = someSchema.parse(body);

    // 3. Query
    const supabase = await createClient();
    const { data, error } = await supabase.from("table")...

    // 4. Response
    return Response.json({ data });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof RoleError) {
      return Response.json({ error: "..." }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return Response.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

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

## Key Directories

```
src/
├── app/api/              # 23 API routes
├── services/auth/        # SOLID auth services (AuthService, RoleService, AuthorizationService)
├── lib/auth/             # API helpers, error classes, constants
├── lib/validations/      # Zod schemas
├── contexts/             # AuthContext
├── components/ui/        # shadcn/ui components
└── types/database.ts     # Supabase generated types
```

## Database Schema (Key Tables)

- `profiles` - User profiles with role (patient | nutritionist)
- `nutrition_entries` - Food diary entries
- `nutrition_images` - Entry photos (storage_path references Supabase Storage)
- `training_sessions` - Exercise logs
- `patient_nutritionist_connections` - Links patients to nutritionists
- `nutritionist_requests` - Connection requests (pending | accepted | rejected)
- `nutritionist_comments` - Feedback on entries/sessions

## Roles

- **patient**: Creates nutrition entries, training sessions; can have one nutritionist
- **nutritionist**: Views connected patients' data, adds comments

## UI Stack

- shadcn/ui components in `src/components/ui/`
- Tailwind CSS with CSS variables for theming
- GSAP + Lenis for animations
