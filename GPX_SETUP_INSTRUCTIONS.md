# 🚀 Instrucciones de Setup - Sistema GPX

## Problema Actual

Ves un error **500 (Internal Server Error)** al intentar crear planes GPX porque las tablas de la base de datos no existen todavía.

## Solución: Aplicar Migraciones en Supabase

### Paso 1: Acceder a Supabase Dashboard

1. Ve a https://supabase.com/dashboard
2. Inicia sesión
3. Selecciona tu proyecto: **NutriDiary** (ID: `epsgadcvrzrwhqrckrey`)

### Paso 2: Ir al SQL Editor

1. En el menú lateral izquierdo, haz click en **SQL Editor**
2. Click en **New Query** (botón verde)

### Paso 3: Copiar y Ejecutar el Script SQL

1. Abre el archivo: `supabase/migrations/APPLY_ALL_GPX_MIGRATIONS.sql`
2. **Copia TODO el contenido del archivo** (Ctrl+A, Ctrl+C)
3. **Pega** en el SQL Editor de Supabase
4. Haz click en el botón **Run** (esquina inferior derecha)

### Paso 4: Verificar Resultados

Al final del script verás:

```
✅ Tres tablas creadas:
   - gpx_plans (12 columnas)
   - gpx_nutrition_waypoints (19 columnas)
   - gpx_plan_versions (8 columnas)

✅ RLS habilitado en todas las tablas

✅ Storage bucket 'gpx-files' creado
```

Si ves algún error:
- **"relation already exists"** → Normal, significa que la tabla ya existe (puedes ignorarlo)
- **"function does not exist"** → Asegúrate de que existe `update_updated_at_column()`
- Cualquier otro error → Copia el mensaje y compártelo

---

## Cambios Implementados

### ✅ Límite de Archivos Aumentado

**Antes**: Máximo 5MB
**Ahora**: Máximo **20MB**

Los archivos GPX de rutas largas (100+ km) pueden ser grandes. Ahora puedes subir:
- Rutas de ultra-maratón (100+ km)
- Tracks con muchos puntos de elevación
- Archivos multi-track

### ✅ Ubicaciones de los Cambios

1. **Backend** - `src/app/api/gpx-plans/[id]/upload/route.ts`
   - `MAX_FILE_SIZE = 20MB` (línea 14)

2. **Next.js Config** - `next.config.ts`
   - `bodySizeLimit: '20mb'` (línea 14)

3. **Frontend** - `src/components/gpx/GPXUploadDialog.tsx`
   - Validación de tamaño: 20MB (línea 46)
   - Texto de ayuda: "máx. 20MB" (línea 182)

4. **Base de Datos** - `supabase/migrations/20241225000000_create_gpx_plans.sql`
   - `gpx_file_path TEXT` (ahora permite NULL hasta que se suba el archivo)

---

## Después de Aplicar las Migraciones

### Paso 1: Reiniciar el Servidor de Desarrollo

```bash
# Detén el servidor (Ctrl+C)
# Vuelve a iniciarlo
npm run dev
```

### Paso 2: Probar el Upload

1. Ve a **Planes GPS** en la sidebar
2. Click en **"Nuevo Plan GPS"**
3. Completa el formulario:
   - **Nombre**: Ej. "Maratón Barcelona 2024"
   - **Archivo GPX**: Sube tu archivo (hasta 20MB)
   - **Deporte**: Selecciona el tipo (running, cycling, etc.)
4. Click en **"Subir y Crear Plan"**

### ✅ Resultado Esperado

Deberías ver:
1. El plan se crea sin errores
2. Redirección a la página del plan
3. Gráfico de elevación visible
4. Stats de la ruta (distancia, desnivel, etc.)

### ❌ Si Aún Hay Errores

Abre la consola del navegador (F12) y busca:
- **"Failed to create plan"** → Las migraciones no se aplicaron correctamente
- **"Failed to upload file"** → Problema con el storage bucket
- **"Validation error"** → Revisa los datos del formulario

---

## Estructura de Tablas Creadas

### `gpx_plans`
Almacena los planes nutricionales GPS

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | ID único del plan |
| user_id | UUID | ID del usuario (paciente) |
| nutritionist_id | UUID | ID del nutricionista (opcional) |
| name | TEXT | Nombre del plan |
| gpx_file_path | TEXT | Ruta del archivo en storage |
| total_distance_km | DECIMAL | Distancia total (calculada) |
| total_elevation_gain_m | INT | Desnivel positivo (calculado) |
| sport_type | TEXT | Tipo de deporte |
| event_date | DATE | Fecha del evento |
| created_at | TIMESTAMPTZ | Fecha de creación |

### `gpx_nutrition_waypoints`
Puntos de nutrición en la ruta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | ID único del waypoint |
| gpx_plan_id | UUID | Referencia al plan |
| latitude | DECIMAL | Latitud |
| longitude | DECIMAL | Longitud |
| trigger_distance_km | DECIMAL | Trigger por distancia |
| trigger_time_min | INT | Trigger por tiempo |
| nutrition_type | TEXT | Tipo (gel, hydration, etc.) |
| product_name | TEXT | Nombre del producto |
| calories | INT | Calorías |
| carbs | DECIMAL | Carbohidratos (g) |
| notes | TEXT | Notas adicionales |

### `gpx_plan_versions`
Historial de versiones (para futuras features)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | ID único |
| gpx_plan_id | UUID | Referencia al plan |
| version_number | INT | Número de versión |
| snapshot | JSONB | Snapshot completo |
| created_at | TIMESTAMPTZ | Fecha de creación |

---

## Seguridad Implementada

✅ **Rate Limiting**: 3 uploads/min (strict tier)
✅ **File Validation**: Solo archivos .gpx permitidos
✅ **Size Limit**: Máximo 20MB
✅ **RLS Policies**: Usuarios solo ven sus propios planes
✅ **Storage Scoped**: Archivos en `{userId}/{planId}/archivo.gpx`
✅ **Audit Logging**: Todas las operaciones se registran

---

## Próximos Pasos (Post-MVP)

Una vez que el sistema básico funcione:

1. **Mapa Interactivo** (Leaflet)
   - Visualizar ruta en mapa
   - Click en mapa → crear waypoint

2. **Auto-generación de Waypoints**
   - "Cada 5km: hidratación"
   - "Cada 30min: gel energético"
   - Templates por evento (maratón, ultra, ironman)

3. **Integración con Biblioteca de Menús**
   - Usar comidas guardadas en waypoints
   - "KM 30: Bocadillo jamón (de biblioteca)"

4. **Analytics de Nutrición**
   - Calorías totales del plan
   - Distribución carbs/protein/fat
   - Timeline de nutrición

---

## Ayuda Adicional

Si tienes problemas:

1. **Verifica las tablas se crearon**:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_name LIKE 'gpx%';
   ```

2. **Verifica RLS está habilitado**:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE tablename LIKE 'gpx%';
   ```

3. **Verifica el storage bucket existe**:
   ```sql
   SELECT id, name, public
   FROM storage.buckets
   WHERE id = 'gpx-files';
   ```

4. **Revisa los logs de Supabase**:
   - Dashboard → Logs → Database
   - Busca errores recientes

---

**¿Listo para probar?** 🚀

Después de aplicar las migraciones, recarga la página y prueba a crear tu primer plan GPS!
