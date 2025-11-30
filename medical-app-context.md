# Contexto del Proyecto - Medical App

## 📋 Resumen del Proyecto

**Aplicación médica** para la gestión de pacientes y doctores con sistema de roles, formularios médicos y upload de documentos.

### Roles de Usuario
- **Pacientes (user)**: Rellenar formularios médicos y subir archivos
- **Doctores (doc)**: Revisar formularios y documentación de pacientes

## 🛠 Stack Tecnológico

### Frontend
- **Next.js 15** (App Router, React 19)
- **TypeScript**
- **Tailwind CSS v3** (downgrade desde v4 para compatibilidad con ShadCN)
- **ShadCN/UI** (componentes de calidad profesional)
- **React Hook Form + Zod** (validaciones)
- **Lucide React** (iconos)
- **date-fns** (manejo de fechas moderno)

### Backend & Base de Datos
- **Supabase**
  - PostgreSQL Database
  - Authentication
  - Storage (archivos médicos)
  - Row Level Security (RLS)
  - Real-time subscriptions

### Autenticación
- **Supabase Auth** (elegido sobre Clerk por integración y costo)

## 📁 Estructura del Proyecto

```
medical-app/
├── app/
│   ├── (auth)/                    # Rutas de autenticación
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/               # Rutas protegidas
│   │   ├── patient/               # Dashboard de pacientes
│   │   │   ├── forms/            # Formularios médicos
│   │   │   ├── documents/        # Mis documentos
│   │   │   └── profile/          # Perfil personal
│   │   └── doctor/               # Dashboard de doctores
│   │       ├── patients/         # Lista de pacientes
│   │       ├── forms-review/     # Revisar formularios
│   │       └── profile/          # Perfil profesional
│   ├── api/                      # API Routes (si necesario)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  # Landing page
├── components/
│   ├── ui/                       # Componentes ShadCN
│   ├── auth/                     # Componentes de autenticación
│   ├── forms/                    # Formularios médicos
│   ├── upload/                   # Upload de archivos
│   └── layout/                   # Layout components
├── lib/
│   ├── supabase.ts              # Cliente de Supabase
│   └── utils.ts                 # Utilidades (con date-fns)
├── hooks/
│   └── usePermissions.ts        # Hook para permisos
├── contexts/
│   └── AuthContext.tsx          # Context de autenticación
├── types/
│   └── database.ts              # Tipos de TypeScript
└── middleware.ts                # Protección de rutas
```

## 🔧 Decisiones Técnicas Importantes

### **Tailwind CSS: v3 en lugar de v4**
- **Razón**: Next.js 15 viene con Tailwind v4 por defecto, pero ShadCN/UI solo es compatible con v3
- **Decisión**: Hacer downgrade inmediato a Tailwind v3.4.x para usar ShadCN
- **Beneficio**: Acceso a componentes profesionales, formularios robustos, desarrollo más rápido

### **ShadCN/UI vs Componentes Custom**
- **ShadCN**: Copy-paste, customizable, accesible, perfect para formularios médicos
- **Decisión**: Usar ShadCN para acelerar desarrollo con componentes de calidad

### **date-fns vs Intl API**
- **Decisión**: Usar date-fns para mejor manejo de fechas, localization, y más funciones

## 🗃 Schema de Base de Datos

### Tablas Principales

#### `profiles`
- Extiende `auth.users` con información adicional
- Campos: `id`, `email`, `full_name`, `role`, `phone`, `date_of_birth`
- Campos específicos de doctores: `medical_license`, `specialization`

#### `medical_forms`
- Formularios médicos de los pacientes
- Campos: `id`, `patient_id`, `form_type`, `title`, `form_data` (JSONB)
- Estados: `draft`, `submitted`, `reviewed`
- Campos de revisión: `doctor_notes`, `reviewed_by`, `reviewed_at`

#### `medical_documents`
- Archivos subidos por pacientes
- Campos: `id`, `patient_id`, `form_id`, `file_name`, `file_path`, `file_type`, `file_size`

#### `doctor_patient_assignments` (opcional)
- Asignaciones específicas doctor-paciente
- Campos: `id`, `doctor_id`, `patient_id`, `assigned_at`

### Storage Buckets
- **`medical-documents`**: Archivos médicos con políticas de seguridad

## 🔐 Sistema de Seguridad

### Row Level Security (RLS)
- **Pacientes**: Solo ven sus propios datos
- **Doctores**: Ven datos de todos los pacientes
- **Formularios**: Pacientes crean/editan borradores, doctores revisan todos
- **Archivos**: Pacientes suben a su carpeta, doctores ven todos

### Middleware de Rutas
- Protección automática de rutas `/patient/*` y `/doctor/*`
- Verificación de roles antes de acceder
- Redirección automática según permisos

## 🎯 Funcionalidades Principales

### Para Pacientes (role: 'user')
1. **Registro y Login**
2. **Dashboard Personal**
   - Resumen de formularios
   - Documentos subidos
   - Estado de revisiones
3. **Formularios Médicos**
   - Formulario de ingreso (intake)
   - Formularios de seguimiento
   - Guardar como borrador
   - Enviar para revisión
4. **Upload de Documentos**
   - Subir archivos médicos
   - Asociar con formularios específicos
   - Ver historial de archivos

### Para Doctores (role: 'doc')
1. **Registro con Licencia Médica**
2. **Dashboard Médico**
   - Estadísticas generales
   - Formularios pendientes de revisión
   - Lista de pacientes
3. **Revisión de Formularios**
   - Ver formularios enviados por pacientes
   - Agregar notas médicas
   - Marcar como revisado
4. **Gestión de Pacientes**
   - Ver perfiles de pacientes
   - Acceder a documentos médicos
   - Historial de formularios por paciente

## 🚀 Flujo de Trabajo

### Flujo del Paciente
1. Registro → Verificación de email → Dashboard
2. Crear formulario médico → Rellenar información → Guardar/Enviar
3. Subir documentos relacionados → Esperar revisión del doctor
4. Ver notas del doctor → Seguimiento según indicaciones

### Flujo del Doctor
1. Registro con licencia → Verificación → Dashboard médico
2. Ver formularios pendientes → Revisar información del paciente
3. Acceder a documentos médicos → Agregar notas profesionales
4. Marcar como revisado → Notificación al paciente

## 📊 Estados y Transiciones

### Estados de Formularios
- **`draft`**: Borrador del paciente (editable)
- **`submitted`**: Enviado para revisión (no editable)
- **`reviewed`**: Revisado por doctor (con notas)

### Permisos por Estado
- Pacientes pueden editar solo `draft`
- Doctores pueden cambiar de `submitted` a `reviewed`
- Solo doctores pueden agregar `doctor_notes`

## 🔄 Expansión Futura

### Funcionalidades Planificadas
- Sistema de citas médicas
- Chat en tiempo real doctor-paciente
- Notificaciones push
- Dashboard de administrador
- Reportes médicos automáticos
- Integración con sistemas hospitalarios

### Consideraciones Técnicas
- Real-time updates con Supabase subscriptions
- Optimización de imágenes automática
- Backup automático de documentos médicos
- Compliance médico (HIPAA, etc.)

## 🧪 Testing Strategy

### Pruebas Planeadas
- **Unit Tests**: Funciones de utilidad y hooks
- **Integration Tests**: Flujos de autenticación y autorización
- **E2E Tests**: Flujos completos de usuario
- **Security Tests**: Verificación de RLS y permisos

## 🚀 Deployment

### Plataforma
- **Vercel** (recomendado para Next.js 15)
- Variables de entorno configuradas
- Preview deployments para testing

### Consideraciones de Producción
- Configuración de dominios personalizados
- SSL certificates automáticos
- Monitoreo de performance
- Logs de errores y analytics

---

## ⏱ Timeline de Desarrollo

| Fase | Duración | Descripción |
|------|----------|-------------|
| 0 | SETUP | **Setup inicial con downgrade Tailwind v4→v3** |
| 1 | 1-2 días | Configuración base y dependencias |
| 2 | 2-3 días | Base de datos y esquema |
| 3 | 2-3 días | Sistema de autenticación |
| 4 | 1-2 días | Middleware y protección de rutas |
| 5 | 1-2 días | Páginas de autenticación |
| 6 | 2-3 días | Dashboards por rol |
| 7 | 2-3 días | Sistema de formularios |
| 8 | 1-2 días | Upload de archivos |
| 9 | 1-2 días | Revisión por doctores |
| 10 | 1-2 días | Testing y deployment |

**Tiempo total estimado: 14-24 días**

## 🎯 FASE ACTUAL: SETUP (Fase 0)

### Objetivo Inmediato:
1. ✅ **Crear proyecto Next.js 15**
2. 🔄 **Downgrade Tailwind v4 → v3**
3. ✅ **Instalar y configurar ShadCN/UI**
4. ✅ **Configurar dependencias base**
5. ✅ **Verificar que todo funciona**

**Una vez completado el setup, iniciaremos la Fase 1.**