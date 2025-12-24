# NutriDiary - Medical App

Aplicación de gestión nutricional que conecta pacientes con nutricionistas, construida con estándares de seguridad enterprise.

## 🚀 Stack Tecnológico

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 3 + ShadCN/UI
- **Backend**: Supabase (Auth, PostgreSQL, Storage, Row Level Security)
- **Validación**: Zod + React Hook Form
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Logging**: Pino (structured logging with PII redaction)
- **Rate Limiting**: Upstash Redis (production) + In-memory (development)

## 📋 Requisitos Previos

- Node.js 18+
- npm o pnpm
- Cuenta de Supabase (gratuita)

## 🔧 Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd medical-app

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase
```

## ⚙️ Variables de Entorno

Crea un archivo `.env.local` con las siguientes variables:

### Desarrollo (Mínimas Requeridas)

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

### Producción (Recomendadas Adicionales)

```env
# Distributed Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Logging Level
LOG_LEVEL=info  # dev: debug, prod: info/warn/error
```

> ⚠️ La aplicación validará automáticamente estas variables al iniciar. Si falta alguna, verás un mensaje de error claro.
>
> 💡 Sin Upstash configurado, la app utilizará rate limiting in-memory (funcional pero no escalable en multi-instancia).

## 🏃 Comandos

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Iniciar servidor de producción
npm run start

# Ejecutar tests
npm run test

# Tests con watch mode
npm run test:watch

# Tests con cobertura
npm run test:coverage

# Linting
npm run lint
```

## 📁 Estructura del Proyecto

```
src/
├── app/                   # App Router (páginas y API routes)
│   ├── api/               # 31 API endpoints (todos con auth + rate limiting)
│   ├── auth/              # Páginas de autenticación
│   └── dashboard/         # Dashboards por rol (patient, nutritionist)
├── components/            # Componentes React
│   ├── ui/                # ShadCN componentes base
│   ├── nutrition/         # Componentes de nutrición
│   ├── training/          # Componentes de entrenamiento
│   └── meal-plans/        # Gestión de planes de comida
├── lib/                   # Utilidades y configuración
│   ├── auth/              # Helpers de autenticación y autorización
│   ├── validations/       # Schemas Zod (nutrition, training, auth)
│   ├── rate-limit.ts      # Rate limiting in-memory (dev)
│   ├── rate-limit-distributed.ts  # Upstash Redis rate limiting (prod)
│   ├── csrf.ts            # CSRF protection
│   ├── logger.ts          # Pino structured logging
│   └── env.ts             # Validación de env vars
├── services/              # Servicios de negocio
│   ├── auth/              # AuthService, RoleService, AuthorizationService
│   └── audit.service.ts   # Audit logging centralizado
├── contexts/              # React Contexts (AuthContext con timeout recovery)
├── hooks/                 # Custom hooks
├── types/                 # TypeScript types
└── proxy.ts               # Next.js 16 session refresh proxy

supabase/migrations/       # Database migrations con RLS
.claude/skills/            # Claude Code skills para desarrollo
CLAUDE.md                  # Documentación completa de arquitectura
```

## 👥 Roles de Usuario

| Rol | Descripción |
|-----|-------------|
| **patient** | Registra comidas, entrenamientos y ve planes de comida |
| **nutritionist** | Gestiona pacientes, crea planes de comida, comenta entradas |

## 🔐 Seguridad (Enterprise-Grade)

NutriDiary implementa múltiples capas de seguridad siguiendo las mejores prácticas OWASP:

### Autenticación & Autorización
- ✅ **Authentication**: Supabase Auth con tokens JWT
- ✅ **Authorization**: RBAC con verificación en cada endpoint
- ✅ **Row Level Security**: Políticas RLS en todas las tablas
- ✅ **Session Management**: Refresh automático con timeout recovery

### Rate Limiting (3 niveles)
- **Strict** (3 req/min): Uploads, deletions, connection requests
- **Auth** (5 req/min): Signup, login, password reset
- **API** (100 req/min): CRUD operations
- **Producción**: Upstash Redis (distributed, multi-instance)
- **Desarrollo**: In-memory fallback

### Validación & Sanitización
- ✅ **Input Validation**: Zod schemas en todos los endpoints
- ✅ **SQL Injection Prevention**: Queries parametrizadas (no string interpolation)
- ✅ **Error Sanitization**: Mensajes genéricos (sin PII, sin detalles de BD)
- ✅ **File Upload**: Magic number verification + MIME type + size limit

### Audit & Logging
- ✅ **Audit Trail**: Tabla `audit_log` con 20+ action types
- ✅ **Structured Logging**: Pino con redacción automática de PII
- ✅ **Client Tracking**: IP address, User-Agent en audit logs
- ✅ **Non-blocking**: Fallos de logging no rompen la app

### Protecciones Adicionales
- ✅ **CSRF Protection**: Tokens para operaciones sensibles
- ✅ **Security Headers**: CSP, HSTS, X-Frame-Options, etc.
- ✅ **Password Policy**: 12+ chars, uppercase, lowercase, number, special
- ✅ **User Enumeration Prevention**: Mensajes genéricos de error

### Compliance
- **HIPAA-ready**: Audit logging + PII redaction
- **GDPR-compliant**: User can view own audit logs
- **SOC 2 ready**: Comprehensive logging and access controls

📖 **Documentación completa**: Ver [CLAUDE.md](CLAUDE.md#security-infrastructure) para detalles técnicos

## 📡 API

31 endpoints REST completamente documentados con:
- ✅ Rate limiting en TODOS los endpoints
- ✅ Autenticación requerida
- ✅ Validación Zod de inputs
- ✅ Audit logging en operaciones sensibles
- ✅ Paginación estándar: `?limit=20&offset=0`

**Patrones de endpoints**:
- `/api/nutrition/*` - Entradas nutricionales, imágenes, conexiones
- `/api/training/*` - Sesiones de entrenamiento
- `/api/meal-plans/*` - Planes de comida (nutritionists)
- `/api/comments/*` - Comentarios de nutricionistas
- `/api/saved-meals/*` - Comidas favoritas guardadas

📖 **Detalles**: Ver [CLAUDE.md](CLAUDE.md#api-route-pattern-security-first) para patrones y ejemplos

## 🧪 Testing

**Cobertura actual**: 195 tests pasando (31 test files)

```bash
# Ejecutar todos los tests
npm run test

# Watch mode
npm run test:watch

# Ver cobertura
npm run test:coverage

# E2E tests
npm run test:e2e
```

**Testing pyramid**:
- ✅ Unit tests: Componentes, hooks, utilities
- ✅ Integration tests: API routes, servicios
- ✅ E2E tests: Flujos críticos de usuario

## 🤖 Claude Code Skills

Este proyecto incluye skills personalizadas para Claude Code que mantienen las mejores prácticas:

### Uso de Skills

```bash
# Revisar seguridad de un endpoint
"Run security-review on src/app/api/nutrition/entries/route.ts"

# Crear nuevo endpoint con mejores prácticas
"Use create-api-endpoint to build a new notifications endpoint"
```

### Skills Disponibles

1. **security-review** - Checklist completo de seguridad
   - Rate limiting, auth, validation
   - Logging, audit, error handling
   - SQL injection, CSRF, file upload
   - Pre-deployment checklist

2. **create-api-endpoint** - Template interactivo para nuevos endpoints
   - Gathering requirements
   - Zod schema generation
   - Complete route templates (GET, POST, PUT, DELETE)
   - RLS policies, tests, verification

📖 **Ver más**: `.claude/skills/README.md` para documentación completa de skills

## 📄 Licencia

MIT
