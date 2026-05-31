# Database conventions & playbook

The single source of truth for how the Ranna database is structured and changed.
Written for a team of one — your future self is the new hire. If a rule here and
the code disagree, the code is a bug or this doc is stale; fix one of them.

---

## 1. The shape of the database

Three layers. Know which one you're touching.

| Layer | Examples | Who reads it |
|-------|----------|--------------|
| **Base tables** | `tracks`, `artists`, `authors`, `collections`, `user_favorites`, `user_plays`, `user_follows`, `user_profiles`, `play_events`, `download_events` | Writes only (admin/app); never read directly by clients for catalog data |
| **Views (`v_*`)** | `v_tracks`, `v_artists`, `v_narrators`, `v_collections`, `v_tracks_admin`, `v_recent_listens`, `v_follower_counts` | Client **reads** of catalog/derived data |
| **RPCs** | `get_home_data`, `search_all`, `get_artist_profile`, `get_narrator_profile`, `get_collection_tracks`, `increment_play_count`, `get_stats_*` | Anything multi-table, aggregated, or privileged |

> **History note:** `tracks` was once `madha`, `artists` was `madiheen`, `authors`
> was `ruwat` (migration 025), kept alive as writable alias views for the web
> admin. The web app has been migrated to the real names and migration 050 drops
> the shim (see §8.B). Do not reintroduce the old names.

---

## 2. Naming conventions

Pick the boring, predictable name. Consistency beats cleverness.

- **Base tables:** plural snake_case nouns — `tracks`, `artists`, `play_events`.
- **Views:** always prefixed `v_` — `v_tracks`, `v_artists`. A `v_` name signals
  "safe to read from a client."
- **Admin-only views:** suffix `_admin` — `v_tracks_admin`.
- **RPCs / functions:** `verb_noun` — `get_home_data`, `increment_play_count`,
  `record_lyrics_view`. Privilege helpers read as predicates: `is_admin_or_superuser`.
- **Foreign keys:** `<singular>_id` referencing `<plural>.id` — `artist_id → artists.id`,
  `track_id → tracks.id`. (Legacy `madih_id`/`rawi_id` were renamed; don't reintroduce them.)
- **Booleans:** `is_*` / `has_*` / `needs_*` — `is_featured`, `needs_processing`.
- **Timestamps:** `*_at` — `created_at`, `updated_at`, `published_at`, `reviewed_at`.

---

## 3. The public-API rule

**Clients read catalog data only through `v_*` views and RPCs — never base tables.**

Why this is the most important rule here:

- **Column safety.** Postgres RLS is *row*-level, not *column*-level. A base table
  with a public SELECT policy exposes **every** column to the anon key, including
  things like `internal_notes`, `reviewed_by`, or `rejection_reason`. A view lists
  columns explicitly, so internal fields simply don't leave the database.
- **Stable contract.** You can refactor base tables behind a view without breaking
  the apps. The Flutter app already reads exclusively through `v_*` — keep it that way.

Practical rules:
- Catalog reads (tracks/artists/authors/collections) → `v_*` views.
- User-owned tables (`user_favorites`, `user_plays`, `user_follows`, `user_profiles`)
  are still accessed directly under per-user RLS — that's fine; they have no internal
  columns and RLS scopes rows to the owner.
- Writes go to base tables (app/admin) under RLS, or through RPCs for privileged ops.
- **Internal-only fields go in a sibling 1:1 admin table (e.g. `track_admin`) with
  admin-only RLS, never as a column on the public base table.** (See the track-table
  plan in the feature backlog.)

---

## 4. status vs visibility (publish model)

Two **orthogonal** concepts — do not collapse them into one field:

- **`status`** = moderation lifecycle: `pending | approved | rejected`.
- **`visibility`** = publish switch: `public | internal | hidden` (planned).

A track can be `status=approved` but `visibility=hidden` because you temporarily
pulled it to fix a problem, or `internal` to expose it to staff only. Public reads
filter `status='approved' AND visibility='public'`; internal users also see
`'internal'`; admins see everything. A lone boolean cannot express "disabled" vs
"internal-only" — use the enum.

---

## 5. Migration workflow (how to not create `fix_v2` migrations)

The history has ~10 `fix_*` migrations. They exist because changes shipped before
being exercised. The gate that prevents this:

1. Make the schema change as a new migration: `pnpm supabase:generate-migration`.
2. **`pnpm supabase:reset`** — the migration must apply cleanly from scratch on an
   empty DB. If reset fails, the migration is broken; fix it *before* pushing.
3. **`pnpm supabase:generate-types`** — regenerate and commit `types_db.ts` (see §6).
4. Smoke-test the app locally against the reset DB.
5. Only then `pnpm supabase:push`.

Rules:
- **One logical change per migration.** Name it by intent: `051_track_media_type.sql`,
  not `051_changes.sql`.
- **Never edit an already-pushed migration.** Write a new one.
- **Forward-only.** If something's wrong in prod, the fix is the next migration —
  but catch it at step 2/4, not in prod.

---

## 6. Generated types are a contract

`types_db.ts` (in `nextjs/` and `supabase/functions/`) is generated from the schema
and is the shared contract for the web app and edge functions. Treat a stale
`types_db.ts` as a build break:

- Run `pnpm supabase:generate-types` after **every** schema change.
- Commit the regenerated file in the **same commit** as the migration.
- The Flutter app doesn't consume it, but it documents the schema for everyone.

---

## 7. RLS conventions

- Every table has RLS enabled.
- Reuse the `SECURITY DEFINER` role helpers — `is_admin_or_superuser()`,
  `get_user_role()` — instead of re-deriving role inline in each policy. Inline
  role checks are how policies drift apart.
- User-owned rows: `USING (auth.uid() = user_id)`.
- Public catalog: `USING (status = 'approved' AND visibility = 'public')` once
  visibility lands.

---

## 8. Planned cleanups (sequenced)

These are the database-hygiene tasks in flight. Do them in order — each unblocks the next.

### A. Lock catalog reads to views (`#3`)
- Confirm the Flutter app reads only `v_*` (done — 0 base-table catalog reads).
- `REVOKE SELECT ON tracks, artists, authors, collections FROM anon;` (keep view
  grants). **Must be tested on a local DB first** — verify the `v_*` views still
  return rows for the anon role (view ownership / `security_invoker` settings matter).

### B. Retire the legacy alias shim (`#1`) — DONE in code, pending deploy
The `madha` / `madiheen` / `ruwat` views + their 9 INSTEAD-OF trigger functions
existed only for the web admin. Status:
- ✅ Web migrated off the legacy names — `madih_id`/`rawi_id` renamed to
  `artist_id`/`author_id` across ~14 files; `.from('madha'|'madiheen'|'ruwat')`
  now target `tracks`/`artists`/`authors`. `tsc --noEmit` passes.
- ✅ Migration `050_drop_legacy_alias_shim.sql` drops the 3 views + 9 functions.
- ⬜ **Rollout (manual):** deploy the updated web app FIRST, then apply migration
  050. The new web code targets tables that already exist, so it's safe to deploy
  ahead of the migration. Smoke-test admin create/edit/delete of a track, artist,
  and narrator after deploy.

### C. Squash the migration history (`#2`)
Once A and B land, collapse 49 migrations into one readable baseline:
```bash
# from nextjs/ — requires Docker + local stack
pnpm supabase:reset                       # apply full chain to a clean local DB
npx supabase db dump --local -f ../supabase/migrations/000_baseline.sql --schema public
# then archive the old migration files (keep in git history) and keep only 000_baseline.sql
```
Verify by `db reset` from the squashed baseline alone, then `db push` is a no-op
against prod (schema already matches). Git history preserves the old chain.

### D. Analytics offload (later)
Migrations 040–049 are almost all stats RPCs running on the transactional DB. When
they start costing you, move product analytics to PostHog or an isolated `analytics`
schema with materialized views, so the catalog DB stays lean.
