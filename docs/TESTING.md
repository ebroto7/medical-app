# Testing Guide

Guía para ejecutar y escribir tests en NutriDiary.

## 🛠️ Framework

Usamos **Vitest** por su velocidad y compatibilidad con Next.js 15+.

## 📦 Comandos

```bash
# Ejecutar tests una vez
npm run test

# Watch mode (re-ejecuta en cambios)
npm run test:watch

# Con reporte de cobertura
npm run test:coverage
```

## 📁 Estructura de Tests

```
src/__tests__/
├── services/
│   ├── authorization.test.ts   # Tests de AuthorizationService
│   └── role.service.test.ts    # Tests de RoleService
└── lib/
    └── validations/
        └── nutrition.test.ts   # Tests de schemas Zod
```

## ✍️ Escribir Tests

### Ejemplo básico

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/my-module';

describe('myFunction', () => {
  it('should return expected value', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

### Mocking Supabase

```typescript
import { vi, beforeEach } from 'vitest';

// Mock antes de imports
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/utils/supabase/server';

beforeEach(() => {
  vi.clearAllMocks();
  
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role: 'patient' }, error: null }),
  };
  
  vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
});
```

### Test con timers

```typescript
import { vi, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('should expire after TTL', async () => {
  // ... setup
  vi.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
  // ... assertions
});
```

## 📊 Cobertura

El reporte de cobertura se genera en `coverage/` después de ejecutar:

```bash
npm run test:coverage
```

### Metas de cobertura

| Directorio | Meta |
|------------|------|
| `src/services/` | 80%+ |
| `src/lib/validations/` | 90%+ |
| `src/lib/auth/` | 70%+ |

## 🔍 Debugging

```bash
# Ejecutar un solo archivo
npx vitest src/__tests__/services/authorization.test.ts

# Ejecutar tests que coincidan con un patrón
npx vitest --grep "requireOwnership"
```
