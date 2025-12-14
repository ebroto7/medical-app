# NutriDiary - Medical App

Aplicación de gestión nutricional que conecta pacientes con nutricionistas.

## 🚀 Stack Tecnológico

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 3 + ShadCN/UI
- **Backend**: Supabase (Auth, PostgreSQL, Storage)
- **Validación**: Zod + React Hook Form
- **Testing**: Vitest

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

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

> ⚠️ La aplicación validará automáticamente estas variables al iniciar. Si falta alguna, verás un mensaje de error claro.

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
├── app/              # App Router (páginas y API routes)
│   ├── api/          # API endpoints
│   ├── auth/         # Páginas de autenticación
│   ├── dashboard/    # Dashboards por rol
│   └── diary/        # Diario nutricional
├── components/       # Componentes React
│   ├── ui/           # ShadCN componentes base
│   ├── nutrition/    # Componentes de nutrición
│   └── training/     # Componentes de entrenamiento
├── lib/              # Utilidades y configuración
│   ├── auth/         # Helpers de autenticación
│   ├── validations/  # Schemas Zod
│   └── env.ts        # Validación de env vars
├── services/         # Servicios de negocio
│   └── auth/         # Servicios de autorización
├── contexts/         # React Contexts
├── hooks/            # Custom hooks
└── types/            # TypeScript types
```

## 👥 Roles de Usuario

| Rol | Descripción |
|-----|-------------|
| **patient** | Registra comidas, entrenamientos y ve planes de comida |
| **nutritionist** | Gestiona pacientes, crea planes de comida, comenta entradas |

## 🔐 Seguridad

- **Rate Limiting**: Endpoints de auth protegidos (5 req/min)
- **Validación de env**: La app falla al iniciar si faltan variables
- **RBAC**: Control de acceso basado en roles en middleware y API
- **Logging**: Logging estructurado con Pino para monitoreo
- **RLS**: Row Level Security en Supabase

Ver [docs/SECURITY.md](docs/SECURITY.md) para más detalles.

## 📡 API y Paginación

La API soporta paginación estándar:
`GET /api/nutrition/entries?page=1&limit=20`

Ver [docs/API.md](docs/API.md) para documentación completa de endpoints.

## 🧪 Testing

Ver [docs/TESTING.md](docs/TESTING.md) para guía completa de testing.

```bash
# Ejecutar todos los tests
npm run test

# Ver cobertura
npm run test:coverage
```

## 📄 Licencia

MIT
