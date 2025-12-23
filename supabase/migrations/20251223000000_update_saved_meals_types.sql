-- Actualizar el constraint de saved_meals para incluir 'extra'
ALTER TABLE saved_meals DROP CONSTRAINT IF EXISTS saved_meals_meal_type_check;

ALTER TABLE saved_meals ADD CONSTRAINT saved_meals_meal_type_check
  CHECK (meal_type IN ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'pre_workout', 'post_workout', 'extra'));
