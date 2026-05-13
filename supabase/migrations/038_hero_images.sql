-- Admin-managed hero images for the landing page on both the public web
-- app and the Flutter app. Replaces the hard-coded `hero-bg` asset with
-- a small CRUD-able catalog. When more than one is_active, both apps
-- crossfade through them.

CREATE TABLE hero_images (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Relative R2 path, e.g. "hero/ramadan.webp" — resolved by
    -- getImageUrl() on both clients at render time.
    image_url     TEXT NOT NULL,
    -- Admin-only label, never rendered on the apps.
    title         TEXT,
    -- Optional in-app deep link, e.g. "/playlist/<uuid>". If set, tapping
    -- the hero on either app navigates there. Null → decorative.
    link_url      TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE hero_images ENABLE ROW LEVEL SECURITY;

-- Public read: any client (anon / authenticated) can list active heroes.
CREATE POLICY "Anyone can view active hero images"
    ON hero_images FOR SELECT
    USING (is_active = TRUE);

-- Admin read of *all* rows (including inactive) — separate policy so admins
-- can see disabled rows in the dashboard without the public-read filter.
CREATE POLICY "Admins can view all hero images"
    ON hero_images FOR SELECT
    USING (is_admin_or_superuser());

-- Admin-only write surface.
CREATE POLICY "Admins can manage hero images"
    ON hero_images FOR ALL
    USING (is_admin_or_superuser())
    WITH CHECK (is_admin_or_superuser());

-- Hot path: clients fetch active heroes ordered by display_order.
CREATE INDEX hero_images_active_order_idx
    ON hero_images (is_active, display_order)
    WHERE is_active = TRUE;
