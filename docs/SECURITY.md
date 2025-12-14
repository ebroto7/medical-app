# Security Documentation

Documentación de medidas de seguridad implementadas en NutriDiary.

## 🛡️ Rate Limiting

### Implementación

Se utiliza un rate limiter en memoria para proteger endpoints sensibles.

**Archivo**: `src/lib/rate-limit.ts`

### Configuraciones

| Preset | Límite | Ventana |
|--------|--------|---------|
| `auth` | 5 req | 60 seg |
| `api` | 100 req | 60 seg |
| `strict` | 3 req | 60 seg |

### Uso

```typescript
import rateLimit from '@/lib/rate-limit';

export async function POST(req: Request) {
  const rateLimitResult = rateLimit(req, 'auth');
  if (!rateLimitResult.success) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: rateLimitResult.headers }
    );
  }
  // ... rest of handler
}
```

### Headers de respuesta

- `X-RateLimit-Limit`: Límite máximo
- `X-RateLimit-Remaining`: Requests restantes
- `X-RateLimit-Reset`: Timestamp de reset
- `Retry-After`: Segundos hasta poder reintentar (solo en 429)

---

## ✅ Validación de Inputs

### Zod Schemas

Todos los inputs de API se validan con Zod antes de procesarse.

**Ubicación**: `src/lib/validations/`

### Ejemplo

```typescript
import { createNutritionEntrySchema } from '@/lib/validations/nutrition';
import { ZodError } from 'zod';

const body = await request.json();
try {
  const validatedData = createNutritionEntrySchema.parse(body);
  // usar validatedData
} catch (error) {
  if (error instanceof ZodError) {
    return Response.json(
      { error: 'Validation error', details: error.issues },
      { status: 400 }
    );
  }
}
```

---

## 🔐 Sistema de Autorización

### Servicios

| Servicio | Responsabilidad |
|----------|-----------------|
| `RoleService` | Gestión de roles con caché |
| `AuthorizationService` | Validación de permisos |

### Helpers de API

**Archivo**: `src/lib/auth/api-helpers.ts`

```typescript
import { requireAuth, requireRole, requireOwnership } from '@/lib/auth/api-helpers';

export async function GET(request: Request) {
  // 1. Requerir autenticación
  const user = await requireAuth();
  
  // 2. Requerir rol específico
  await requireRole(user.id, ['nutritionist']);
  
  // 3. Verificar propiedad de recurso
  requireOwnership(user.id, resource.ownerId);
}
```

### Errores tipados

| Error | Status | Descripción |
|-------|--------|-------------|
| `AuthenticationError` | 401 | No autenticado |
| `AuthorizationError` | 403 | Sin permisos |
| `RoleError` | 403 | Rol incorrecto |
| `OwnershipError` | 403 | No es propietario |

---

## 🔒 Variables de Entorno

### Validación automática

La app valida todas las variables de entorno requeridas al iniciar.

**Archivo**: `src/lib/env.ts`

### Variables requeridas

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | String | Clave anónima |
| `SUPABASE_SERVICE_ROLE_KEY` | String | Clave de servicio (solo servidor) |

### Comportamiento

- **Desarrollo**: Error en consola con detalles
- **Build**: Falla el build con mensaje claro
- **Producción**: Falla el inicio si faltan variables

---

## 🛡️ Middleware de Rutas

**Archivo**: `src/utils/supabase/middleware.ts`

### Protecciones

1. **Refresh de tokens**: Automático en cada request
2. **Rutas protegidas**: `/dashboard/*`, `/diary/*`
3. **Control de acceso por rol**: Nutricionistas vs Pacientes
4. **Redirección automática**: Según permisos

---

## ⚠️ Consideraciones Futuras

### Para producción multi-instancia

- Migrar rate limiting a Redis (Upstash)
- Implementar CSRF tokens
- Agregar auditoría de logs
- Configurar WAF en el CDN

### Compliance

- Revisar requisitos HIPAA/GDPR según región
- Implementar logs de auditoría
- Configurar retención de datos
