# Testing Guide

Guía completa para el sistema de pruebas de NutriDiary.

## 🛠️ Tech Stack
- **Runner**: [Vitest](https://vitest.dev/) (Compatible con Jest)
- **Environment**: `jsdom` para Frontend, `node` para Backend logic
- **Frontend Utilities**: `@testing-library/react`, `@testing-library/user-event`
- **Mocks**: `vi.mock()` para Supabase, `fetch`, y módulos

## 📦 Comandos Principales

```bash
# Ejecutar suite completa (Backend + Frontend)
npm run test

# Watch mode (Desarrollo TDD)
npm run test:watch

# Generar reporte de cobertura
npm run test:coverage

# Ejecutar tests de UI solamente
npx vitest src/__tests__/components

# Ejecutar tests de API solamente
npx vitest src/__tests__/api
```

## 📁 Estructura de Tests

Nuestra suite está organizada para reflejar la arquitectura de la aplicación:

```
src/__tests__/
├── api/                  # Integration tests para API Routes
│   ├── auxiliary.test.ts # Health, Comments, Notifications
│   ├── nutrition/        # CRUD entries, Connections
│   ├── meal-plans/       # Lógica compleja de planes
│   └── training/         # Sesiones de entrenamiento
├── components/           # Component tests (JSDOM)
│   ├── core/             # Layout, Sidebar, Header
│   ├── meal-plans/       # Listas y Diálogos complejos
│   ├── ui/               # Primitivas (Button, Select)
│   └── NutritionEntryForm.test.tsx
├── services/             # Lógica de negocio pura (Unit)
│   ├── auth.service.test.ts
│   └── role.service.test.ts
├── hooks/                # Custom React Hooks
│   └── use-toast.test.tsx
├── lib/                  # Utilidades y configuración
│   ├── rate-limit.test.ts
│   └── logger.test.ts
└── pages/                # Page-level integration
    └── LoginPage.test.tsx
```

## 🧪 Estrategias de Testing

### 1. API Integration Tests
Mockeamos **Supabase** pero ejecutamos la lógica real de los endpoints (`NextRequest`/`NextResponse`).
- **Objetivo**: Verificar status codes, estructura JSON y validación Zod.
- **Ejemplo**: `src/__tests__/api/nutrition/entries-crud.test.ts`

### 2. Frontend Component Tests
Usamos `render` de Testing Library para simular el DOM real.
- **Objetivo**: Verificar renderizado condicional, eventos de usuario y accesibilidad básica.
- **Interacciones**: Usamos `fireEvent` o `userEvent` para clicks y formularios.
- **Mocks Clave**: `useAuth` (Contexto), `useRouter`, `fetch` (API calls).

### 3. Services & Utils (Unit)
Tests aislados para lógica pura.
- **Objetivo**: Verificar reglas de negocio (roles, ownership) y algoritmos (rate limit).

## 📝 Guía de Mocks Comunes

### Mocking AuthContext
```typescript
import { useAuth } from '@/contexts/AuthContext';
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));

// En el test:
(useAuth as any).mockReturnValue({
  user: { id: '123' },
  role: 'nutritionist',
  token: 'mock-token'
});
```

### Mocking Fetch Global
```typescript
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: [] }),
});
```

## 📊 Cobertura Esperada
Mantenemos una cobertura alta en módulos críticos:
- **Services/Auth**: >90%
- **API Core**: >80%
- **UI Complex Components**: >70%
