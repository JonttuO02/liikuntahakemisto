-- Create suosikit (favorites) table
CREATE TABLE IF NOT EXISTS suosikit (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paikka_id   bigint NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, paikka_id)
);

-- Enable Row Level Security
ALTER TABLE suosikit ENABLE ROW LEVEL SECURITY;

-- Users can read only their own favorites
CREATE POLICY "Users can read own suosikit"
  ON suosikit FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert only their own favorites (WITH CHECK — not USING)
CREATE POLICY "Users can insert own suosikit"
  ON suosikit FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own favorites
CREATE POLICY "Users can delete own suosikit"
  ON suosikit FOR DELETE
  USING (auth.uid() = user_id);
