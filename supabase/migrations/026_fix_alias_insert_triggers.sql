-- Migration 026: Fix INSTEAD OF INSERT triggers on madiheen and ruwat alias views.
-- Problem 1: INSERT INTO artists VALUES (NEW.*) passes NULL for id
-- Problem 2: RETURNING * INTO NEW fails because view row != table row
-- Fix: Explicit column list + RETURNING id INTO local var

CREATE OR REPLACE FUNCTION madiheen_alias_insert_fn() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO artists (id, name, created_at, created_by, status, reviewed_by, reviewed_at, bio, image_url, birth_year, death_year, is_verified, tariqa_id)
    VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        NEW.name,
        COALESCE(NEW.created_at, NOW()),
        NEW.created_by,
        COALESCE(NEW.status, 'pending'),
        NEW.reviewed_by,
        NEW.reviewed_at,
        NEW.bio,
        NEW.image_url,
        NEW.birth_year,
        NEW.death_year,
        COALESCE(NEW.is_verified, false),
        NEW.tariqa_id
    )
    RETURNING id INTO new_id;

    NEW.id := new_id;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION ruwat_alias_insert_fn() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO authors (id, name, created_at, created_by, status, reviewed_by, reviewed_at, bio, image_url, birth_year, death_year)
    VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        NEW.name,
        COALESCE(NEW.created_at, NOW()),
        NEW.created_by,
        COALESCE(NEW.status, 'pending'),
        NEW.reviewed_by,
        NEW.reviewed_at,
        NEW.bio,
        NEW.image_url,
        NEW.birth_year,
        NEW.death_year
    )
    RETURNING id INTO new_id;

    NEW.id := new_id;
    RETURN NEW;
END;
$$;
