-- Migration: Create madiheen and ruwat tables
-- This migration creates separate tables for performers (madiheen) and narrators (ruwat)

-- Create madiheen table (performers)
CREATE TABLE IF NOT EXISTS madiheen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create ruwat table (narrators/writers)
CREATE TABLE IF NOT EXISTS ruwat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE madiheen ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruwat ENABLE ROW LEVEL SECURITY;

-- Madiheen policies
CREATE POLICY "Anyone can view madiheen"
    ON madiheen FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can add madiheen"
    ON madiheen FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Ruwat policies
CREATE POLICY "Anyone can view ruwat"
    ON ruwat FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can add ruwat"
    ON ruwat FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Migrate existing data from madha table
-- Insert unique madih names into madiheen
INSERT INTO madiheen (name)
SELECT DISTINCT madih FROM madha WHERE madih IS NOT NULL AND madih != ''
ON CONFLICT (name) DO NOTHING;

-- Insert unique writer names into ruwat
INSERT INTO ruwat (name)
SELECT DISTINCT writer FROM madha WHERE writer IS NOT NULL AND writer != ''
ON CONFLICT (name) DO NOTHING;

-- Add foreign key columns to madha
ALTER TABLE madha ADD COLUMN IF NOT EXISTS madih_id UUID REFERENCES madiheen(id);
ALTER TABLE madha ADD COLUMN IF NOT EXISTS rawi_id UUID REFERENCES ruwat(id);

-- Update madha with foreign key references
UPDATE madha SET madih_id = m.id
FROM madiheen m
WHERE madha.madih = m.name;

UPDATE madha SET rawi_id = r.id
FROM ruwat r
WHERE madha.writer = r.name;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_madha_madih_id ON madha(madih_id);
CREATE INDEX IF NOT EXISTS idx_madha_rawi_id ON madha(rawi_id);
CREATE INDEX IF NOT EXISTS idx_madiheen_name ON madiheen(name);
CREATE INDEX IF NOT EXISTS idx_ruwat_name ON ruwat(name);

-- Note: We keep the original text columns (madih, writer) for backward compatibility
-- They can be dropped in a future migration once the app is fully migrated
