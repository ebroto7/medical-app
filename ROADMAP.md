# NutriDiary - Roadmap de Funcionalidades

## 🚀 Nuevas Funcionalidades

### 1. Sistema de Pautas Nutricionales (Meal Plans)

El nutricionista crea pautas personalizadas para sus pacientes con dos modalidades:

#### 1.1 Pautas Semanales (Calendario)
- **Estructura:** Lunes-Domingo × Comidas del día
- **Slots configurables:** Desayuno, Media mañana, Almuerzo, Merienda, Cena
- **Cada slot contiene:** nombre del plato, descripción, macros opcionales
- **Vista calendario** para que el paciente vea qué comer cada día

#### 1.2 Pautas Situacionales
El nutricionista define títulos personalizados según el contexto del paciente:
- "Día de entreno - Mañana"
- "Día de entreno - Tarde"
- "Día de oficina"
- "Fin de semana"
- Cualquier título que desee

Cada pauta situacional contiene sus propias comidas/slots. El paciente selecciona qué "situación" aplica a cada día.

#### Tablas Supabase:
```sql
-- Pautas creadas por nutricionistas
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id UUID REFERENCES profiles(id) NOT NULL,
  patient_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT CHECK (type IN ('weekly', 'situational')) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Slots de la pauta semanal (lunes desayuno, etc)
CREATE TABLE weekly_plan_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE NOT NULL,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL, -- 0=Lunes
  meal_type TEXT NOT NULL, -- breakfast, mid_morning, lunch, snack, dinner
  meal_name TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  calories INT,
  protein DECIMAL,
  carbs DECIMAL,
  fat DECIMAL
);

-- Pautas situacionales (día entreno mañana, etc)
CREATE TABLE situational_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, -- "Día de entreno - Mañana"
  sort_order INT DEFAULT 0
);

-- Slots dentro de cada pauta situacional
CREATE TABLE situational_plan_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  situational_plan_id UUID REFERENCES situational_plans(id) ON DELETE CASCADE NOT NULL,
  meal_type TEXT NOT NULL,
  meal_name TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  calories INT,
  protein DECIMAL,
  carbs DECIMAL,
  fat DECIMAL,
  sort_order INT DEFAULT 0
);
```

---

### 2. Sistema de Comidas Guardadas (Saved Meals)

El paciente puede guardar y reutilizar sus comidas favoritas.

**Funcionalidad:**
- Guardar una entrada de nutrición como "favorita" o "plantilla"
- Ejemplo: "Yogur con avena y arándanos" guardado como desayuno recurrente
- Al crear nueva entrada, opción de "Usar comida guardada"
- Copia los datos (nombre, descripción, macros) a la nueva entrada

#### Tabla Supabase:
```sql
CREATE TABLE saved_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL, -- "Yogur con avena y arándanos"
  description TEXT,
  meal_type TEXT, -- breakfast, lunch, dinner, snack
  calories INT,
  protein DECIMAL,
  carbs DECIMAL,
  fat DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saved meals"
  ON saved_meals FOR ALL
  USING (auth.uid() = user_id);
```

---

### 3. Exportación PDF de Pautas

Descarga de pautas nutricionales en formato PDF profesional.

**Características:**
- Botón "Descargar PDF" en la vista de pauta
- Diseño profesional con logo y datos del nutricionista
- Todas las comidas organizadas por día (semanal) o situación
- Formato listo para imprimir

**Librería sugerida:** `@react-pdf/renderer` o `jspdf`

---

### 4. Sistema de Objetivos/Metas

El nutricionista define objetivos para el paciente.

**Tipos de objetivos:**
- **Macros diarios:** calorías target, gramos de proteína, etc.
- **Peso objetivo:** con fecha límite opcional
- **Personalizados:** texto libre para objetivos específicos

**Dashboard:** El paciente ve su progreso vs objetivo con indicadores visuales.

#### Tabla Supabase:
```sql
CREATE TABLE patient_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES profiles(id) NOT NULL,
  nutritionist_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT CHECK (type IN ('macro', 'weight', 'custom')) NOT NULL,
  name TEXT NOT NULL,
  target_value DECIMAL,
  current_value DECIMAL,
  unit TEXT, -- 'kcal', 'kg', 'g', etc.
  description TEXT,
  deadline DATE,
  is_achieved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 5. Habit Tracker

Seguimiento de hábitos diarios para mejorar adherencia.

**Funcionalidad:**
- Nutricionista o paciente crea hábitos a trackear
- Ejemplos: "Beber 2L agua", "Dormir 8h", "No picar entre horas"
- Check diario (completado/no completado)
- Vista semanal/mensual de cumplimiento
- Estadísticas de racha (streak)

#### Tablas Supabase:
```sql
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL, -- nutritionist o patient
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly')) DEFAULT 'daily',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  UNIQUE(habit_id, date)
);
```

---

### 6. Botón de Creación Rápida en Vista Día

Mejora UX para crear entradas desde la vista diaria del calendario.

**Funcionalidad:**
- Botón al final de la lista de entradas del día
- Abre CreateEntryDialog con fecha pre-rellenada del día seleccionado
- Reduce fricción: usuario no necesita cambiar la fecha manualmente
- Texto contextual: "Agregar Entrada para [fecha]"

**Ubicación:** Vista Día en `/dashboard/patient` (DayView component)

**Estado:** ✅ Implementado

---

## 📋 Orden de Implementación Sugerido

| Fase | Funcionalidad | Complejidad | Dependencias |
|------|--------------|-------------|--------------|
| 1 | Comidas Guardadas | Baja | Ninguna |
| 2 | Pautas Semanales | Media | Ninguna |
| 3 | Pautas Situacionales | Media | Fase 2 |
| 4 | Objetivos/Metas | Media | Ninguna |
| 5 | Habit Tracker | Media | Ninguna |
| 6 | Exportación PDF | Baja | Fase 2-3 |

**Razonamiento:**
- **Fase 1 (Comidas Guardadas):** Es la más simple y da valor inmediato al paciente
- **Fases 2-3 (Pautas):** Core del producto, permite al nutricionista crear planes
- **Fase 4 (Objetivos):** Complementa las pautas con metas medibles
- **Fase 5 (Habits):** Mejora adherencia y engagement
- **Fase 6 (PDF):** Complementa las pautas ya existentes

---

## 🔧 Deuda Técnica Pendiente

Ver `AUDITORIA.md` para lista completa. Prioridades:

- [ ] URLs firmadas bajo demanda para fotos
- [ ] Paginación en listados largos
- [ ] Centralizar creación de clientes Supabase
- [ ] Logging estructurado
- [ ] Validar variables de entorno al iniciar

---

## 📝 Notas

- Este documento sirve como guía para futuras sesiones de desarrollo
- Cada fase debe incluir: migraciones SQL, API routes, componentes UI, tests
- Mantener consistencia con el estilo Neo-Brutalism existente
- Usar `requireAuth` y `requireRole` en todas las API routes
- Validar inputs con Zod
