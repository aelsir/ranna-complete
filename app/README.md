# Ranna — Flutter app

Sudanese مدائح نبوية streaming app. Anonymous-first auth, Riverpod state, Supabase backend.

## Build flags

### `INTERNAL_DEVICE` — analytics-hygiene flag for dev devices

When set to `true`, the app **skips `recordPlay` entirely** — no rows hit
`user_plays`, regardless of whether the user is logged in or anonymous. Use
this on the founder's iPhones, designer test devices, and anywhere the
analytics shouldn't see local listening.

Pair it with the runtime `user_profiles.is_internal` flag (migration 036)
to cover both anonymous-mode dev sessions (build flag) and logged-in
internal accounts (DB flag).

```bash
# Dev / TestFlight build for an internal device
flutter run --dart-define=INTERNAL_DEVICE=true -d <device>
flutter build ios --dart-define=INTERNAL_DEVICE=true ...

# Production App Store build — DO NOT pass the flag.
flutter build ios --release ...
```

The flag defaults to `false` if omitted, so any production build (CI or
local) without the flag records plays normally.

To verify a build:

```bash
# Inside the running app, search the logs for the flag's resolved value.
# If you see "_kInternalDevice = true" anywhere it's been logged, the
# flag is active. Or just check whether plays are landing in `user_plays`
# via the SQL editor.
```

## Reading dashboard analytics correctly

Three sources of "internal" activity are filtered out of admin analytics:

1. **`user_profiles.is_internal = TRUE`** — accounts manually flagged as team. See migration 036.
2. **`INTERNAL_DEVICE` build flag** — Flutter dev devices.
3. **Web `PlayerContext.tsx`** — short-circuits `recordPlay` when the logged-in user is `isInternal` (covers dashboard QA listening + the founder's own webapp use).

Anonymous user activity is **never** filtered — it's load-bearing signal in the anon-first model.

## Getting Started (Flutter scaffolding — TODO replace)

Default Flutter project scaffolding. Real architecture docs live in [`/CLAUDE.md`](../CLAUDE.md) at the repo root.

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

