-- Phase 1: Foundation & Security (DATA-04, ADS-01)
ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS hinta_kuvaus text;
ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS aukioloajat jsonb;
ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS lajit_lista jsonb;
ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
