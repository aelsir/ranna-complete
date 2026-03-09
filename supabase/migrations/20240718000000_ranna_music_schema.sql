-- =====================================================
-- Ranna Music Schema
-- Consolidated from ranna-v2 migrations 001-019
-- This represents the final state of all music tables
-- =====================================================

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- USER ROLES
-- =====================================================

CREATE TABLE user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('superuser', 'admin', 'user')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Role lookup functions (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION get_user_role(check_user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM user_roles WHERE user_id = check_user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT get_user_role(auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin_or_superuser()
RETURNS BOOLEAN AS $$
  SELECT get_user_role(auth.uid()) IN ('admin', 'superuser');
$$ LANGUAGE sql SECURITY DEFINER;

-- user_roles RLS policies
CREATE POLICY "Users can read own role" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Superusers can manage all roles" ON user_roles
    FOR ALL USING (get_user_role(auth.uid()) = 'superuser');

-- =====================================================
-- TURUQ (الطرق الصوفية - Sufi Orders)
-- =====================================================

CREATE TABLE turuq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE turuq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view turuq" ON turuq
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage turuq" ON turuq
    FOR ALL USING (is_admin_or_superuser());

-- Initial data
INSERT INTO turuq (name) VALUES
    ('السمانية'),
    ('القادرية'),
    ('التيجانية'),
    ('البرهانية'),
    ('الختمية'),
    ('الإسماعيلية')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- FUNUN (الفنون - Music Styles/Tones)
-- =====================================================

CREATE TABLE funun (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE funun ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view funun" ON funun
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage funun" ON funun
    FOR ALL USING (is_admin_or_superuser());

-- Initial data
INSERT INTO funun (name) VALUES
    ('المخبوت'),
    ('المربع'),
    ('المعشر'),
    ('الدقلاشي'),
    ('الحربي')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- MADIHEEN (المادحين - Artists/Performers)
-- =====================================================

CREATE TABLE madiheen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    bio TEXT,
    image_url TEXT,
    birth_year INTEGER,
    death_year INTEGER,
    is_verified BOOLEAN DEFAULT FALSE,
    tariqa_id UUID REFERENCES turuq(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE madiheen ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_madiheen_name ON madiheen(name);
CREATE INDEX idx_madiheen_tariqa ON madiheen(tariqa_id);

-- RLS: Anonymous can view approved, owners see own, admins see all
CREATE POLICY "Anyone can view approved madiheen" ON madiheen
    FOR SELECT USING (status = 'approved');

CREATE POLICY "Owners can view own madiheen" ON madiheen
    FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Admins can view all madiheen" ON madiheen
    FOR SELECT USING (is_admin_or_superuser());

CREATE POLICY "Authenticated users can add madiheen" ON madiheen
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can update madiheen" ON madiheen
    FOR UPDATE USING (is_admin_or_superuser());

CREATE POLICY "Admins can delete madiheen" ON madiheen
    FOR DELETE USING (is_admin_or_superuser());

-- =====================================================
-- RUWAT (الرواة - Narrators/Writers)
-- =====================================================

CREATE TABLE ruwat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    bio TEXT,
    image_url TEXT,
    birth_year INTEGER,
    death_year INTEGER,
    status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE ruwat ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ruwat_name ON ruwat(name);

-- RLS: same pattern as madiheen
CREATE POLICY "Anyone can view approved ruwat" ON ruwat
    FOR SELECT USING (status = 'approved');

CREATE POLICY "Owners can view own ruwat" ON ruwat
    FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Admins can view all ruwat" ON ruwat
    FOR SELECT USING (is_admin_or_superuser());

CREATE POLICY "Authenticated users can add ruwat" ON ruwat
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can update ruwat" ON ruwat
    FOR UPDATE USING (is_admin_or_superuser());

CREATE POLICY "Admins can delete ruwat" ON ruwat
    FOR DELETE USING (is_admin_or_superuser());

-- =====================================================
-- MADHA (المدحة - Tracks/Songs)
-- =====================================================

CREATE TABLE madha (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    madih TEXT NOT NULL,
    writer TEXT,
    audio_url TEXT, -- nullable: URL imports don't have audio initially
    image_url TEXT,
    source_url TEXT, -- original source URL (YouTube, SoundCloud, etc.)
    lyrics TEXT, -- كلمات المدحة
    recording_place TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    madih_id UUID REFERENCES madiheen(id) ON DELETE SET NULL,
    rawi_id UUID REFERENCES ruwat(id) ON DELETE SET NULL,
    tariqa_id UUID REFERENCES turuq(id) ON DELETE SET NULL,
    fan_id UUID REFERENCES funun(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    needs_processing BOOLEAN DEFAULT FALSE,
    play_count INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE madha ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_madha_madih_id ON madha(madih_id);
CREATE INDEX idx_madha_rawi_id ON madha(rawi_id);
CREATE INDEX idx_madha_tariqa ON madha(tariqa_id);
CREATE INDEX idx_madha_fan ON madha(fan_id);
CREATE INDEX idx_madha_featured ON madha(is_featured);
CREATE INDEX idx_madha_needs_processing ON madha(needs_processing) WHERE needs_processing = TRUE;

-- Auto-update updated_at trigger
CREATE TRIGGER madha_updated_at
    BEFORE UPDATE ON madha
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- RLS: Anonymous can view approved, owners see own, admins see all
CREATE POLICY "Anyone can view approved madha" ON madha
    FOR SELECT USING (status = 'approved');

CREATE POLICY "Owners can view own madha" ON madha
    FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all madha" ON madha
    FOR SELECT USING (is_admin_or_superuser());

CREATE POLICY "Authenticated users can insert" ON madha
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own madha" ON madha
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update madha" ON madha
    FOR UPDATE USING (is_admin_or_superuser());

CREATE POLICY "Users or admins can delete madha" ON madha
    FOR DELETE USING (
        auth.uid() = user_id
        OR is_admin_or_superuser()
    );

-- =====================================================
-- COLLECTIONS (المجموعات - Playlists)
-- =====================================================

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

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_collections_active ON collections(is_active, display_order);
CREATE INDEX idx_collection_items_collection ON collection_items(collection_id);

CREATE POLICY "Anyone can view active collections" ON collections
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage collections" ON collections
    FOR ALL USING (is_admin_or_superuser());

CREATE POLICY "Anyone can view collection items" ON collection_items
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage collection items" ON collection_items
    FOR ALL USING (is_admin_or_superuser());

-- =====================================================
-- USER PROFILES
-- =====================================================

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    country TEXT DEFAULT 'السودان',
    city TEXT,
    tariqa_id UUID REFERENCES turuq(id),
    email_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles" ON user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- USER FAVORITES
-- =====================================================

CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    madha_id UUID REFERENCES madha(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, madha_id)
);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);

CREATE POLICY "Users can view own favorites" ON user_favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites" ON user_favorites
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- USER PLAYS (Analytics)
-- =====================================================

CREATE TABLE user_plays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    madha_id UUID REFERENCES madha(id) ON DELETE CASCADE,
    played_at TIMESTAMPTZ DEFAULT NOW(),
    duration_seconds INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    device_type TEXT
);

ALTER TABLE user_plays ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_plays_madha ON user_plays(madha_id);
CREATE INDEX idx_user_plays_user ON user_plays(user_id);

CREATE POLICY "Users can view own plays" ON user_plays
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert plays" ON user_plays
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- LISTENING HISTORY
-- =====================================================

CREATE TABLE listening_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    madha_id UUID NOT NULL REFERENCES madha(id) ON DELETE CASCADE,
    listened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, madha_id)
);

ALTER TABLE listening_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_listening_history_user_id ON listening_history(user_id);
CREATE INDEX idx_listening_history_listened_at ON listening_history(listened_at DESC);

CREATE POLICY "Users can view own listening history" ON listening_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own listening history" ON listening_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listening history" ON listening_history
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own listening history" ON listening_history
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- STORAGE POLICIES (for Supabase Storage buckets)
-- Create "audio" and "images" buckets in Supabase Dashboard first
-- =====================================================

CREATE POLICY "Public audio access" ON storage.objects
    FOR SELECT USING (bucket_id = 'audio');

CREATE POLICY "Authenticated audio upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'audio' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated audio update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'audio' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated audio delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'audio' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public images access" ON storage.objects
    FOR SELECT USING (bucket_id = 'images');

CREATE POLICY "Authenticated images upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated images update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated images delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'images' AND auth.uid() IS NOT NULL);

-- =====================================================
-- HANDLE NEW USER TRIGGER
-- Auto-create user_profiles when a new user signs up
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_profiles (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
