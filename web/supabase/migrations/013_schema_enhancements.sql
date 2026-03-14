-- Migration 013: Database Schema Enhancements
-- Adds: turuq (Sufi orders), funun (taar tones), collections, user_profiles, analytics tables
-- Enhances: madha, madiheen, ruwat tables

-- ============================================
-- 1. TURUQ (الطريقة الصوفية - Sufi Orders)
-- ============================================
CREATE TABLE turuq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE turuq ENABLE ROW LEVEL SECURITY;

-- Anyone can view turuq
CREATE POLICY "Anyone can view turuq" ON turuq
    FOR SELECT USING (true);

-- Only admins can manage turuq
CREATE POLICY "Admins can manage turuq" ON turuq
    FOR ALL USING (is_admin_or_superuser());

-- Insert initial data
INSERT INTO turuq (name) VALUES
    ('السمانية'),
    ('القادرية'),
    ('التيجانية'),
    ('البرهانية'),
    ('الختمية'),
    ('الإسماعيلية')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. FUNUN (الفنون - Taar Tones)
-- ============================================
CREATE TABLE funun (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE funun ENABLE ROW LEVEL SECURITY;

-- Anyone can view funun
CREATE POLICY "Anyone can view funun" ON funun
    FOR SELECT USING (true);

-- Only admins can manage funun
CREATE POLICY "Admins can manage funun" ON funun
    FOR ALL USING (is_admin_or_superuser());

-- Insert initial data
INSERT INTO funun (name) VALUES
    ('المخبوت'),
    ('المربع'),
    ('المعشر'),
    ('الدقلاشي'),
    ('الحربي')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. COLLECTIONS (المجموعات)
-- ============================================
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE collection_items (
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    madha_id UUID REFERENCES madha(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (collection_id, madha_id)
);

-- Enable RLS
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view active collections
CREATE POLICY "Anyone can view active collections" ON collections
    FOR SELECT USING (is_active = true);

-- Admins can manage collections
CREATE POLICY "Admins can manage collections" ON collections
    FOR ALL USING (is_admin_or_superuser());

-- Anyone can view collection items
CREATE POLICY "Anyone can view collection items" ON collection_items
    FOR SELECT USING (true);

-- Admins can manage collection items
CREATE POLICY "Admins can manage collection items" ON collection_items
    FOR ALL USING (is_admin_or_superuser());

-- Indexes
CREATE INDEX idx_collections_active ON collections(is_active, display_order);
CREATE INDEX idx_collection_items_collection ON collection_items(collection_id);

-- ============================================
-- 4. USER PROFILES
-- ============================================
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT CHECK (display_name ~ '^[\u0600-\u06FF\s]+$'),
    avatar_url TEXT,
    bio TEXT,
    country TEXT DEFAULT 'السودان',
    city TEXT,
    tariqa_id UUID REFERENCES turuq(id),
    email_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view all profiles
CREATE POLICY "Anyone can view profiles" ON user_profiles
    FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- 5. USER FAVORITES
-- ============================================
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    madha_id UUID REFERENCES madha(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, madha_id)
);

-- Enable RLS
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites" ON user_favorites
    FOR SELECT USING (auth.uid() = user_id);

-- Users can manage their own favorites
CREATE POLICY "Users can manage own favorites" ON user_favorites
    FOR ALL USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);

-- ============================================
-- 6. USER PLAYS (Analytics)
-- ============================================
CREATE TABLE user_plays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    madha_id UUID REFERENCES madha(id) ON DELETE CASCADE,
    played_at TIMESTAMPTZ DEFAULT NOW(),
    duration_seconds INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    device_type TEXT
);

-- Enable RLS
ALTER TABLE user_plays ENABLE ROW LEVEL SECURITY;

-- Users can view their own plays
CREATE POLICY "Users can view own plays" ON user_plays
    FOR SELECT USING (auth.uid() = user_id);

-- Anyone can insert plays (for anonymous tracking too)
CREATE POLICY "Anyone can insert plays" ON user_plays
    FOR INSERT WITH CHECK (true);

-- Index
CREATE INDEX idx_user_plays_madha ON user_plays(madha_id);
CREATE INDEX idx_user_plays_user ON user_plays(user_id);

-- ============================================
-- 7. ENHANCE MADHA TABLE
-- ============================================
ALTER TABLE madha ADD COLUMN IF NOT EXISTS recording_place TEXT;
ALTER TABLE madha ADD COLUMN IF NOT EXISTS tariqa_id UUID REFERENCES turuq(id);
ALTER TABLE madha ADD COLUMN IF NOT EXISTS fan_id UUID REFERENCES funun(id);
ALTER TABLE madha ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0;
ALTER TABLE madha ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE madha ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_madha_tariqa ON madha(tariqa_id);
CREATE INDEX IF NOT EXISTS idx_madha_fan ON madha(fan_id);
CREATE INDEX IF NOT EXISTS idx_madha_featured ON madha(is_featured);

-- ============================================
-- 8. ENHANCE MADIHEEN TABLE
-- ============================================
ALTER TABLE madiheen ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE madiheen ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE madiheen ADD COLUMN IF NOT EXISTS birth_year INTEGER;
ALTER TABLE madiheen ADD COLUMN IF NOT EXISTS death_year INTEGER;
ALTER TABLE madiheen ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE madiheen ADD COLUMN IF NOT EXISTS tariqa_id UUID REFERENCES turuq(id);

-- Index
CREATE INDEX IF NOT EXISTS idx_madiheen_tariqa ON madiheen(tariqa_id);

-- ============================================
-- 9. ENHANCE RUWAT TABLE
-- ============================================
ALTER TABLE ruwat ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE ruwat ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE ruwat ADD COLUMN IF NOT EXISTS birth_year INTEGER;
ALTER TABLE ruwat ADD COLUMN IF NOT EXISTS death_year INTEGER;

-- ============================================
-- DONE!
-- ============================================
