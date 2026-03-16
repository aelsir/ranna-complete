-- Madha Table Migration
-- Run this in your Supabase SQL Editor

-- Create madha table
CREATE TABLE madha (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  madih TEXT NOT NULL,
  writer TEXT,
  audio_url TEXT NOT NULL,
  image_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE madha ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read madha
CREATE POLICY "Anyone can view madha" ON madha
  FOR SELECT USING (true);

-- Only authenticated users can insert
CREATE POLICY "Authenticated users can insert" ON madha
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own madha
CREATE POLICY "Users can update own madha" ON madha
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own madha
CREATE POLICY "Users can delete own madha" ON madha
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER madha_updated_at
  BEFORE UPDATE ON madha
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
