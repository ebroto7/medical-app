# Sesión 23 Diciembre 2024 - Biblioteca de Comidas

## 📋 Resumen de la Sesión

Se completó e implementó **totalmente** la funcionalidad de **Biblioteca de Comidas** (Saved Meals), permitiendo a los pacientes guardar, organizar y reutilizar sus comidas favoritas.

---

## ✅ Funcionalidades Implementadas

### 1. Página "Biblioteca de Comidas" (`/dashboard/patient/saved-meals`)

**Archivo:** `src/app/dashboard/patient/saved-meals/page.tsx`

**Características:**
- ✅ CRUD completo (Crear, Leer, Editar, Eliminar)
- ✅ Grid responsive (1 columna mobile, 2 columnas desktop)
- ✅ Cards con información: nombre, tipo, descripción, macros
- ✅ Empty state cuando no hay comidas guardadas
- ✅ Filtros por tipo de comida con contadores
- ✅ Botones de acción: Editar (lápiz) y Eliminar (papelera)

**Filtros implementados:**
- Botón "Todas (X)" - muestra todas las comidas
- Botones dinámicos por tipo: solo aparecen los tipos que tienes guardados
- Ejemplo: "Desayuno (3)", "Merienda (2)"
- Cada botón filtra la vista al tipo seleccionado

---

### 2. Dialog "Guardar Comida" - SaveMealDialog

**Archivo:** `src/components/saved-meals/SaveMealDialog.tsx`

**Características:**
- ✅ Dual-mode: Controlled y Uncontrolled
- ✅ Modo creación y modo edición
- ✅ Selector de tipo de comida (8 opciones)
- ✅ Campos: Nombre, Tipo, Descripción, Macros (Kcal, Prot, Carb, Gras)
- ✅ Validación con Zod
- ✅ Toasts de confirmación

**Cambios clave:**
- Agregado prop `initialData` para modo edición
- Agregado prop `open` y `onOpenChange` para modo controlled
- Agregado `useEffect` para resetear formulario cuando cambian los datos
- Agregado campo `meal_type` al formulario
- Soporte para UPDATE y CREATE en `onSubmit`

---

### 3. Botón "Guardar" en Entradas del Diario

**Archivo:** `src/components/nutrition/EntryDetailDialog.tsx`

**Características:**
- ✅ Botón icono 📑 (BookmarkPlus outline) en esquina superior derecha
- ✅ Tooltip: "Agregar a biblioteca"
- ✅ Solo visible para pacientes (no nutricionistas)
- ✅ Nombre automático: "{Tipo} favorito" (ej: "Desayuno favorito")
- ✅ Pre-rellena descripción de la entrada
- ✅ Conversión automática de formatos de meal_type

**Conversión de formatos:**
```typescript
entry.meal_type === 'mid-morning' ? 'morning_snack'
entry.meal_type === 'afternoon-snack' ? 'afternoon_snack'
entry.meal_type === 'pre-workout' ? 'pre_workout'
entry.meal_type === 'post-workout' ? 'post_workout'
```

---

### 4. Selector "Usar Comida Guardada" en Formulario

**Archivo:** `src/components/nutrition/NutritionEntryForm.tsx`

**Características:**
- ✅ Botón "Usar comida guardada" junto al campo Descripción
- ✅ Abre SavedMealsDialog para seleccionar
- ✅ Al seleccionar, rellena automáticamente la descripción
- ✅ Icono BookOpen

---

### 5. Botones Visibles en WeeklyPlanGrid

**Archivo:** `src/components/meal-plans/WeeklyPlanGrid.tsx`

**Cambios:**
- ✅ Botones "Reutilizar" y "Guardar" ahora **inline** (no en popover)
- ✅ Se muestran debajo del input cuando hay `meal_name`
- ✅ Icono Info (ℹ) para acceder a descripción/macros (antes "...")
- ✅ Mejor descubribilidad de la funcionalidad

**Estructura visual:**
```
┌────────────────────────────┐
│ [Nombre del plato....] ⓘ  │ ← Input con Info button
│ [Reutilizar] [Guardar]    │ ← Botones inline visibles
└────────────────────────────┘
```

---

### 6. Botón Crear Entrada en DayView

**Archivo:** `src/components/calendar/DayView.tsx`

**Características:**
- ✅ Botón al final de la lista de entradas del día
- ✅ Texto: "Agregar Entrada para {fecha}"
- ✅ Abre CreateEntryDialog con fecha pre-rellenada
- ✅ Reduce fricción: usuario no cambia fecha manualmente
- ✅ Solo visible cuando no es readOnly

---

### 7. Sidebar - Nuevo Ítem

**Archivo:** `src/components/Sidebar.tsx`

**Cambios:**
- ✅ Agregado ítem "Biblioteca de Comidas" (antes "Biblioteca de menús")
- ✅ Icono: Library
- ✅ Color: Yellow (antes amber, cambiado a yellow disponible)
- ✅ Posición: Entre "Mi Diario" y "Mis Pautas"
- ✅ Solo visible para pacientes
- ✅ Textos alineados a la izquierda (corregido)

**Orden del menú (pacientes):**
1. Mi Diario
2. Biblioteca de Comidas ← NUEVO
3. Mis Pautas
4. Nutricionistas
5. Notificaciones
6. Perfil

---

### 8. Soporte para 8 Tipos de Comida

**Tipos unificados en ambos sistemas:**

| Valor (DB) | Etiqueta | Disponible en |
|------------|----------|---------------|
| `breakfast` | Desayuno | Entradas + Biblioteca |
| `morning_snack` / `mid-morning` | Media Mañana | Entradas + Biblioteca |
| `lunch` | Comida | Entradas + Biblioteca |
| `afternoon_snack` / `afternoon-snack` | Merienda | Entradas + Biblioteca |
| `dinner` | Cena | Entradas + Biblioteca |
| `pre_workout` / `pre-workout` | Pre-Entreno | Entradas + Biblioteca |
| `post_workout` / `post-workout` | Post-Entreno | Entradas + Biblioteca |
| `extra` | Extra | Entradas + Biblioteca |

**Nota:**
- NutritionEntries usa guiones: `mid-morning`, `afternoon-snack`
- SavedMeals usa guiones bajos: `morning_snack`, `afternoon_snack`
- La conversión se hace automáticamente en EntryDetailDialog

---

## 🗄️ Base de Datos - Migraciones Aplicadas

### Migración 1: Crear tabla `saved_meals`

**Archivo:** `supabase/migrations/20251215000000_create_saved_meals.sql`

**Estado:** ✅ Aplicada

```sql
CREATE TABLE saved_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'pre_workout', 'post_workout')),
  calories INT DEFAULT 0,
  protein DECIMAL(10, 2) DEFAULT 0,
  carbs DECIMAL(10, 2) DEFAULT 0,
  fat DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS habilitado
-- Policies: SELECT, INSERT, UPDATE, DELETE (auth.uid() = user_id)
-- Index: saved_meals_user_id_idx
```

### Migración 2: Agregar tipo 'extra'

**Archivo:** `supabase/migrations/20251223000000_update_saved_meals_types.sql`

**Estado:** ✅ Aplicada

```sql
ALTER TABLE saved_meals DROP CONSTRAINT IF EXISTS saved_meals_meal_type_check;

ALTER TABLE saved_meals ADD CONSTRAINT saved_meals_meal_type_check
  CHECK (meal_type IN ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'pre_workout', 'post_workout', 'extra'));
```

---

## 🎯 Flujo de Usuario Completo

### Caso de Uso 1: Guardar una comida desde el diario

1. Usuario va a "Mi Diario"
2. Abre una entrada de comida (ej: "Desayuno - queso fresco, tostadas...")
3. Click en icono 📑 (tooltip: "Agregar a biblioteca")
4. Se abre dialog pre-rellenado:
   - Nombre: "Desayuno favorito"
   - Tipo: "breakfast" (detectado automáticamente)
   - Descripción: contenido de la entrada
5. Usuario edita nombre si quiere: "Mi desayuno habitual"
6. Click "Guardar"
7. Toast: "Comida guardada"

### Caso de Uso 2: Crear comida nueva desde biblioteca

1. Usuario va a "Biblioteca de Comidas" (sidebar)
2. Click "Nueva Comida"
3. Rellena formulario:
   - Nombre: "Merienda proteica"
   - Tipo: "Merienda"
   - Descripción: "Yogur griego + frutos secos"
   - Macros: 250 kcal, 20g prot, 15g carb, 10g gras
4. Click "Guardar"
5. Aparece en la biblioteca

### Caso de Uso 3: Usar comida guardada en nueva entrada

1. Usuario click "Nueva Entrada" (botón verde sidebar)
2. Selecciona fecha y tipo: "Merienda"
3. Click "Usar comida guardada" (junto a Descripción)
4. Selecciona "Merienda proteica"
5. Se rellena automáticamente descripción
6. Agrega fotos si quiere
7. Guardar entrada

### Caso de Uso 4: Filtrar comidas en biblioteca

1. Usuario va a "Biblioteca de Comidas"
2. Ve botones de filtro: [Todas (10)] [Desayuno (3)] [Merienda (2)] [Comida (5)]
3. Click en "Merienda (2)"
4. Solo ve las 2 meriendas guardadas
5. Click "Todas" para ver todas de nuevo

### Caso de Uso 5: Editar comida guardada

1. Usuario va a "Biblioteca de Comidas"
2. Click en icono lápiz de una comida
3. Edita nombre, tipo, descripción o macros
4. Click "Guardar"
5. Toast: "Comida actualizada"

---

## 📁 Archivos Modificados/Creados

### Creados (NUEVOS)
```
✨ src/app/dashboard/patient/saved-meals/page.tsx
✨ src/components/ui/tooltip.tsx (shadcn/ui)
✨ supabase/migrations/20251215000000_create_saved_meals.sql
✨ supabase/migrations/20251223000000_update_saved_meals_types.sql
```

### Modificados (EXISTENTES)
```
📝 src/components/saved-meals/SaveMealDialog.tsx
📝 src/components/nutrition/NutritionEntryForm.tsx
📝 src/components/nutrition/EntryDetailDialog.tsx
📝 src/components/meal-plans/WeeklyPlanGrid.tsx
📝 src/components/calendar/DayView.tsx
📝 src/components/diary/CreateEntryDialog.tsx
📝 src/components/Sidebar.tsx
📝 ROADMAP.md
```

**Total:** 4 nuevos, 8 modificados

---

## 🐛 Problemas Resueltos Durante la Sesión

### 1. Tabla saved_meals no existía
**Error:** `Could not find the table 'public.saved_meals'`
**Solución:** Usuario aplicó migración SQL manualmente desde dashboard Supabase

### 2. Badge mostraba "afternoon_snack" en lugar de "Merienda"
**Causa:** Faltaban etiquetas traducidas en `mealTypeLabels`
**Solución:** Agregado mapeo completo de los 8 tipos

### 3. Botones de Saved Meals ocultos en popover
**Problema:** Baja descubribilidad
**Solución:** Movidos inline debajo del input, icono Info para detalles

### 4. Color "amber" no existía en IconBadge
**Error:** TypeScript error - color no válido
**Solución:** Cambiado a "yellow" (color disponible)

### 5. Falta selector de tipo al crear comida nueva
**Problema:** No se podía elegir tipo al crear desde biblioteca
**Solución:** Agregado FormField para meal_type en SaveMealDialog

### 6. Inconsistencia de tipos entre sistemas
**Problema:** Entradas tenían opciones diferentes a Biblioteca
**Solución:** Unificado a 8 tipos en ambos sistemas

### 7. MCP Tools de Supabase con timeout
**Problema:** No podían aplicar migraciones vía MCP
**Solución:** Usuario aplicó SQL manualmente desde dashboard (método confiable)

---

## 🚀 Estado Actual del Proyecto

### ✅ Completamente Funcional
- Biblioteca de Comidas con CRUD
- Guardar desde diario
- Reutilizar en entradas
- Reutilizar en planes semanales
- Filtros por tipo
- 8 tipos de comida soportados
- Sidebar actualizado
- Migraciones aplicadas

### 📊 Métricas
- **Archivos nuevos:** 4
- **Archivos modificados:** 8
- **Migraciones DB:** 2
- **Tipos de comida:** 8
- **Build:** ✅ Exitoso
- **TypeScript:** ✅ Sin errores

---

## 🔮 Próximos Pasos Sugeridos (Futuro)

### Mejoras Corto Plazo
- [ ] Tests unitarios para SavedMealsService
- [ ] Tests integración para página Biblioteca de Comidas
- [ ] Agregar búsqueda por nombre en Biblioteca
- [ ] Permitir duplicar comidas guardadas
- [ ] Agregar imágenes a comidas guardadas (opcional)

### Mejoras Medio Plazo
- [ ] Estadísticas: comidas más usadas
- [ ] Compartir comidas entre pacientes (marketplace de recetas)
- [ ] Importar comidas desde bases de datos nutricionales
- [ ] Categorías/tags adicionales (vegetariano, sin gluten, etc.)
- [ ] Calculadora automática de macros

### Optimizaciones
- [ ] Cachear comidas guardadas en cliente (React Query)
- [ ] Paginación si usuario tiene >50 comidas
- [ ] Lazy loading de imágenes en cards

---

## 📚 Documentación de Referencia

### Tipos de Comida - Mapeo Completo

**Para nuevos desarrolladores:**

Cuando trabajes con meal_type, ten en cuenta:
- **NutritionEntries** usa guiones: `mid-morning`, `afternoon-snack`, `pre-workout`, `post-workout`
- **SavedMeals** usa guiones bajos: `morning_snack`, `afternoon_snack`, `pre_workout`, `post_workout`

**Conversión se hace en:** `src/components/nutrition/EntryDetailDialog.tsx` líneas 300-304

### Colores de Badge en Sidebar

Colores disponibles en IconBadge:
- `orange`, `yellow`, `green`, `red`, `blue`, `purple`, `primary`, `muted`

NO usar: `amber` (no existe)

### Políticas RLS de saved_meals

```sql
-- Solo el owner puede ver sus comidas
SELECT: auth.uid() = user_id

-- Solo el owner puede crear comidas
INSERT: auth.uid() = user_id

-- Solo el owner puede editar sus comidas
UPDATE: auth.uid() = user_id

-- Solo el owner puede eliminar sus comidas
DELETE: auth.uid() = user_id
```

---

## ⚙️ Configuración Importante

### Dependencias Agregadas
```json
{
  "@radix-ui/react-tooltip": "^1.x.x"  // Agregado vía shadcn/ui
}
```

### Variables de Entorno
No se requieren nuevas variables de entorno.

### API Endpoints Usados
```
GET    /api/saved-meals           - Listar comidas del usuario
POST   /api/saved-meals           - Crear comida
PATCH  /api/saved-meals/:id       - Actualizar comida
DELETE /api/saved-meals/:id       - Eliminar comida
```

---

## 🎓 Lecciones Aprendidas

1. **Migraciones son importantes** - No eliminarlas, son como git para la BD
2. **MCP Tools pueden dar timeout** - Dashboard de Supabase es más confiable para SQL
3. **Unificación de tipos** - Mejor tener las mismas opciones en ambos sistemas
4. **Conversión automática** - Necesaria entre formatos con guiones vs guiones bajos
5. **UX > Features** - Botones inline > Botones ocultos en popover
6. **Controlled vs Uncontrolled** - SaveMealDialog soporta ambos modos para flexibilidad

---

## ✨ Créditos

**Sesión realizada:** 23 Diciembre 2024
**Funcionalidad principal:** Biblioteca de Comidas (Saved Meals)
**Estado:** ✅ Completada y funcionando
**Build status:** ✅ Exitoso
**Migraciones DB:** ✅ Aplicadas

---

## 📞 Continuación de la Sesión

Para continuar trabajando en este proyecto, revisa:
1. Este documento (contexto completo)
2. `ROADMAP.md` (roadmap general del proyecto)
3. Sección "Próximos Pasos Sugeridos" arriba

**Siguiente tarea recomendada:**
Agregar tests para la funcionalidad de Saved Meals.
