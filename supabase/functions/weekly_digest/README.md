# Weekly Digest Function

Sends a Friday-morning email to every user in `user_profiles` where:
- `email_notifications = true`, AND
- they follow at least one مادح / راوي whose tracks have grown in the last 7 days.

Users with no new tracks across all their follows are **skipped** — no empty email is ever sent.

## Architecture (one DB call + one Resend call per 100 users)

The function is fully batched:

1. **Single SQL call** — `get_weekly_digest_batch(since)` (migration 036) returns one row per *eligible* user (`{ user_id, email, display_name, digest }`). The SQL itself filters out: users who opted out, users without an email on `auth.users`, and users with no new tracks in any of their follows. So the result set IS the recipient list — no per-user gating in the edge function.
2. **Resend batch** — POST `/emails/batch` accepts up to 100 emails per request. The function chunks the recipient list and fires `ceil(N/100)` HTTP calls.

Network round-trips:

| User count | DB calls | Resend calls | Total |
|---:|---:|---:|---:|
|     1 | 1 | 1 |   2 |
|   100 | 1 | 1 |   2 |
| 1,000 | 1 | 10 | 11 |
|10,000 | 1 | 100 | 101 |

The previous per-user version did `~3N` round-trips; this one is dominated by Resend chunking, so ~100× faster at the 100-user scale.

## Files

- `index.ts` — single-file function. Auth gate → RPC call → chunked Resend sends. Includes the HTML/plain-text/subject renderers inline so the file can be pasted directly into the Supabase Dashboard's Edge Function editor (which only accepts a single source file).
- Migration `036_weekly_digest_batch.sql` — defines both `get_weekly_digest_batch(since)` (the batched RPC the edge function calls) and `get_weekly_digest(user_id, since)` (single-user preview helper for the SQL editor).

## Required env vars

Set with `supabase secrets set --env-file .env`:

```
RESEND_API_KEY=re_...
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CRON_SECRET=<long random string>
RANNA_APP_URL=https://ranna.aelsir.sd
RANNA_IMAGE_BASE_URL=https://pub-5231206b23e34ae59ce4f085c70f77be.r2.dev
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected when deployed but explicit env vars work the same.

## Deploy

```bash
cd supabase
supabase db push                                    # apply migrations 035 + 036
supabase functions deploy weekly_digest             # deploy the function
supabase secrets set --env-file .env                # one-time secret push
```

## Trigger

The function requires `Authorization: Bearer ${CRON_SECRET}` on every request. Without that header it returns `401`. This means you can safely point any external cron at it:

```bash
curl -X POST https://<project>.supabase.co/functions/v1/weekly_digest \
  -H "Authorization: Bearer $CRON_SECRET"
```

The body is empty. The response is JSON like:

```json
{
  "ok": true,
  "window_since": "2026-04-19T08:00:00.000Z",
  "recipients": 38,
  "sent": 38,
  "failed": 0,
  "duration_ms": 920
}
```

`recipients` is the count of users the SQL function returned (people who actually had new tracks). The "candidates / skipped" breakdown from the older version is no longer surfaced — the batch RPC filters everything out at the SQL layer, so the edge function never sees skipped users at all. If you want operational visibility into how many people opted out vs. had no new tracks, run:

```sql
SELECT
  COUNT(*) FILTER (WHERE email_notifications = TRUE) AS candidates_total,
  (SELECT COUNT(*) FROM get_weekly_digest_batch((now() - interval '7 days')::timestamptz)) AS will_email
FROM user_profiles;
```

## Scheduling options

Pick one — the function itself is stateless and idempotent within a 7-day window (running it multiple times on the same Friday will resend, so don't).

### A. cron-job.org (no infra)

Free service. Add a cron entry:
- URL: `https://<project>.supabase.co/functions/v1/weekly_digest`
- Method: `POST`
- Header: `Authorization: Bearer <CRON_SECRET>`
- Schedule: `0 5 * * 5` (Fridays 05:00 UTC = 08:00 Khartoum). Adjust to taste.

### B. GitHub Actions

Add `.github/workflows/weekly-digest.yml`:

```yaml
name: Weekly Digest
on:
  schedule:
    - cron: '0 5 * * 5'    # Fri 05:00 UTC = 08:00 Khartoum
  workflow_dispatch:        # manual trigger button
jobs:
  send:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fS -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.SUPABASE_URL }}/functions/v1/weekly_digest"
```

Add `CRON_SECRET` and `SUPABASE_URL` to the repo's GitHub Actions secrets.

### C. pg_cron (in-database)

Requires enabling the extension first (separate migration):

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'weekly-digest',
  '0 5 * * 5',
  $$SELECT net.http_post(
      url := 'https://<project>.supabase.co/functions/v1/weekly_digest',
      headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
    );$$
);
```

## Manual preview / testing

Preview what one specific user will receive (no email sent):

```sql
SELECT get_weekly_digest(
  '<user-uuid>'::uuid,
  (now() - interval '7 days')::timestamptz
);
```

Returns the JSONB payload. Empty `[]` means: no email would be sent for this user this week.

Preview the entire recipient list the cron run would produce (no email sent):

```sql
SELECT user_id, email, display_name, jsonb_array_length(digest) AS group_count
FROM get_weekly_digest_batch((now() - interval '7 days')::timestamptz)
ORDER BY display_name;
```

To force-send to one address (admin testing), invoke the function with a `target_user_id` query param — **this isn't built yet**; if you want that, add a `?user_id=<uuid>` short-circuit at the top of `index.ts` that gates on the same `CRON_SECRET`.

## Behavioral notes

- **`status = 'approved'`** — both the artist/author row AND the track row must be approved. Pending uploads don't trigger digests.
- **`target_type IN ('artist', 'author')`** — tariqa and fan follows are saved in `user_follows` but the digest deliberately ignores them. The user explicitly scoped the email to مادح / راوي only.
- **No country awareness yet** — every user gets the same UTC firing time. When the design includes per-country send time, replace the single cron with one per region, OR add a per-row "preferred_send_hour_local" column and have the cron run hourly + filter.
- **Idempotency** — running the function twice on the same Friday will resend everyone. The cron source must enforce single-fire.
- **`email_notifications` is the source of truth** — the toggle in زاويتي writes to `user_profiles.email_notifications` AND `push_notifications` together. Only the email column is read here.
