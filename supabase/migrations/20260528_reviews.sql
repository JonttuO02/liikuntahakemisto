-- Create reviews table for venue ratings and comments
-- Modeled after supabase/migrations/20260528083110_profiles.sql (RLS pattern)
--         and supabase/migrations/20260523_suosikit.sql (bigserial PK + UNIQUE pattern)
CREATE TABLE IF NOT EXISTS reviews (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paikka_id bigint NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  teksti text NOT NULL DEFAULT '',
  is_anonymous boolean NOT NULL DEFAULT false,
  reviewer_name text,
  visit_date date,
  crowd_rating text CHECK (crowd_rating IN ('hiljaista', 'sopivasti', 'ruuhkaista')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, paikka_id)
);

-- Enable Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (public read for REVIEW-04)
CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT
  USING (true);

-- Users can insert only their own review (T-15-01 mitigation)
CREATE POLICY "Users can insert own review"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update only their own review (D-03 edit path)
CREATE POLICY "Users can update own review"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
