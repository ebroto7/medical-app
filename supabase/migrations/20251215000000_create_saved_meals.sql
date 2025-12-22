-- Create saved_meals table
CREATE TABLE IF NOT EXISTS saved_meals (
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

-- Enable RLS
ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own saved meals"
  ON saved_meals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved meals"
  ON saved_meals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved meals"
  ON saved_meals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved meals"
  ON saved_meals FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX saved_meals_user_id_idx ON saved_meals(user_id);
