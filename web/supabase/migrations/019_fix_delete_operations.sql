-- Migration 019: Fix delete operations
-- 1. Change FK constraints on madha to SET NULL on delete for madiheen/ruwat
-- 2. Add DELETE RLS policies for madiheen and ruwat (admin-only)

-- =====================================================
-- 1. ALTER FK CONSTRAINTS: ON DELETE SET NULL
-- =====================================================

-- madih_id → SET NULL when madih is deleted
ALTER TABLE madha DROP CONSTRAINT IF EXISTS madha_madih_id_fkey;
ALTER TABLE madha ADD CONSTRAINT madha_madih_id_fkey 
    FOREIGN KEY (madih_id) REFERENCES madiheen(id) ON DELETE SET NULL;

-- rawi_id → SET NULL when rawi is deleted
ALTER TABLE madha DROP CONSTRAINT IF EXISTS madha_rawi_id_fkey;
ALTER TABLE madha ADD CONSTRAINT madha_rawi_id_fkey 
    FOREIGN KEY (rawi_id) REFERENCES ruwat(id) ON DELETE SET NULL;

-- tariqa_id → SET NULL when tariqa is deleted
ALTER TABLE madha DROP CONSTRAINT IF EXISTS madha_tariqa_id_fkey;
ALTER TABLE madha ADD CONSTRAINT madha_tariqa_id_fkey 
    FOREIGN KEY (tariqa_id) REFERENCES turuq(id) ON DELETE SET NULL;

-- fan_id → SET NULL when fan is deleted
ALTER TABLE madha DROP CONSTRAINT IF EXISTS madha_fan_id_fkey;
ALTER TABLE madha ADD CONSTRAINT madha_fan_id_fkey 
    FOREIGN KEY (fan_id) REFERENCES funun(id) ON DELETE SET NULL;

-- madiheen.tariqa_id → SET NULL when tariqa is deleted
ALTER TABLE madiheen DROP CONSTRAINT IF EXISTS madiheen_tariqa_id_fkey;
ALTER TABLE madiheen ADD CONSTRAINT madiheen_tariqa_id_fkey 
    FOREIGN KEY (tariqa_id) REFERENCES turuq(id) ON DELETE SET NULL;

-- =====================================================
-- 2. ADD DELETE RLS POLICIES
-- =====================================================

-- Admins can delete madiheen
DROP POLICY IF EXISTS "Admins can delete madiheen" ON madiheen;
CREATE POLICY "Admins can delete madiheen" ON madiheen
    FOR DELETE USING (is_admin_or_superuser());

-- Admins can delete ruwat
DROP POLICY IF EXISTS "Admins can delete ruwat" ON ruwat;
CREATE POLICY "Admins can delete ruwat" ON ruwat
    FOR DELETE USING (is_admin_or_superuser());

-- =====================================================
-- DONE!
-- When a madih or rawi is deleted, the associated madhaat
-- keep their data but their madih_id/rawi_id becomes NULL.
-- =====================================================
