-- Migration: Add new columns to pending_imports table
-- Supports tariqa, fan, and lyrics fields when users submit YouTube imports

ALTER TABLE pending_imports 
ADD COLUMN IF NOT EXISTS tariqa_id UUID REFERENCES turuq(id),
ADD COLUMN IF NOT EXISTS fan_id UUID REFERENCES funun(id),
ADD COLUMN IF NOT EXISTS lyrics TEXT;