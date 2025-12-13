# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Dev server with Turbopack
npm run build    # Production build
npm run start    # Run production build
npm run lint     # ESLint
```

No test framework is configured.

## Architecture Overview

NutriDiary is a nutrition tracking app connecting patients with nutritionists. Built with Next.js 15 (App Router) + Supabase + TypeScript.

### Authentication Flow

```
Browser (AuthContext)     Middleware              API Routes
       │                      │                        │
       ├─ createBrowserClient │                        │
       │                      │                        │
       │  GET /dashboard/*    │                        │
       │ ────────────────────>│                        │
       │                      ├─ getUser() [refreshes] │
       │                      ├─ role check            │
       │                      │                        │
       │  GET /api/*          │                        │
       │ ───────────────────────────────────────────>  │
       │                      │                        ├─ requireAuth()
       │                      │                        ├─ requireRole()
```

- **Middleware** (`src/utils/supabase/middleware.ts`): Refreshes session tokens + route protection
- **AuthContext** (`src/contexts/AuthContext.tsx`): Client-side auth state via `onAuthStateChange`
- **API helpers** (`src/lib/auth/api-helpers.ts`): Reusable auth decorators for routes

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

- `src/utils/supabase/server.ts` - Server client for API routes (uses cookies)
- `src/utils/supabase/client.ts` - Browser client
- `src/utils/supabase/middleware.ts` - Middleware client with cookie propagation

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
