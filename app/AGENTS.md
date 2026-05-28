# Analytics Tracking — Mixpanel

This project uses **Mixpanel** for all product analytics. Mixpanel is the single source of truth for event tracking, user identification, and behavioral data. Do not introduce any other analytics tools, SDKs, or tracking libraries without explicit instruction from a user.

---

## Before You Add or Modify Any Tracking

⛔ **Do not write Mixpanel tracking code without reading this file first.**

Wrong assumptions about platform, identity, or consent will produce broken Mixpanel data that requires manual cleanup or data deletion requests.

### Mandatory checklist before writing any Mixpanel code

- [ ] Confirm you are using the correct Mixpanel SDK for this project's platform (see Tech Stack below)
- [ ] Check if this project routes data through a CDP — it does NOT; send events via the Mixpanel SDK directly
- [ ] Check if consent gating is required — this project does NOT serve EU or California users; no consent gate needed
- [ ] Review the existing Mixpanel tracking plan below before adding new events

---

## Tech Stack

| Detail | Value |
|---|---|
| **Platform** | Flutter (iOS, Android, Web) |
| **Mixpanel SDK** | `mixpanel_flutter` |
| **SDK version** | `^2.3.0` |
| **Tracking method** | Client-side |
| **CDP (if any)** | None |
| **Consent required** | No |
| **Mixpanel project token location** | `env.json` → `MIXPANEL_TOKEN` (injected via `--dart-define-from-file=env.json`) |

---

## Mixpanel Initialization

Mixpanel is initialized in:

**File:** `lib/services/mixpanel_service.dart`

```dart
// Mixpanel is initialized once at app startup in main.dart → _startApp()
// via MixpanelService.init(token).
// Access the singleton anywhere: MixpanelService.instance.track(...)
// Do not create additional Mixpanel instances.
```

**Do not:**
- Initialize Mixpanel in multiple places
- Create separate Mixpanel instances per component or module
- Import `mixpanel_flutter` directly in feature files — use `MixpanelService`

---

## Mixpanel Identity

Mixpanel identity is managed through two calls:

| Action | When to call | Code location |
|---|---|---|
| `MixpanelService.instance.identify(user.id)` | On login, signup, or session restore | `lib/providers/auth_notifier.dart` → `_applySession()` |
| `MixpanelService.instance.reset()` | On logout | `lib/providers/auth_notifier.dart` → `signOut()` |

**Rules:**
- Call `identify()` with the Supabase user ID (UUID) — never use email addresses as the Mixpanel distinct_id
- Call `identify()` **after** the session is confirmed (after Supabase auth completes)
- Call `reset()` on every logout path — this clears the Mixpanel distinct_id and generates a new anonymous ID
- Never call `identify()` with a different user ID without calling `reset()` first

---

## Mixpanel Tracking Plan

These are the Mixpanel events currently tracked in this project. **All new Mixpanel events must follow the same conventions.**

### Naming conventions

- Mixpanel event names: `snake_case`, past tense verb + noun (e.g., `track_played`, `sign_up_completed`)
- Mixpanel property names: `snake_case` (e.g., `sign_up_method`, `track_title`)
- No abbreviations in Mixpanel event or property names — use full words
- Boolean Mixpanel properties: use `is_` prefix (e.g., `is_first_time`)

### Current Mixpanel events

| Mixpanel Event | Trigger | Key Properties | File |
|---|---|---|---|
| `sign_up_completed` | User completes magic-link signup (session upgrades from anonymous) | `sign_up_method`, `platform`, `country` | `lib/screens/auth_callback_screen.dart` |
| `track_played` | User starts playing a track (madha) | `track_id`, `track_title`, `artist_name`, `device_type` | `lib/services/audio_player_service.dart` |

### Super properties (auto-attached to every event)

| Property | Value | Set in |
|---|---|---|
| `platform` | `ios` / `android` / `web` / `macos` | `MixpanelService.init()` |
| `app_version` | Current app version (e.g., `3.1.4`) | `MixpanelService.init()` |

---

## How to Add a New Mixpanel Event

1. **Check the tracking plan above** — if the Mixpanel event already exists, use it. Do not create duplicate Mixpanel events.
2. **Name the Mixpanel event** using the conventions above: `snake_case`, past tense, descriptive.
3. **Define Mixpanel properties** — only include properties available at the moment the event fires. Do not fetch additional data just for Mixpanel tracking.
4. **Place the Mixpanel tracking call** at the right moment:
   - Track Mixpanel events **after** the action succeeds (after DB write, after API response), not on button click or form submit
   - Track Mixpanel events **after** `identify()` if the event is tied to a logged-in action
5. **Update this file** — add the new Mixpanel event to the tracking plan table above.
6. **Verify in Mixpanel Live View** — confirm the event appears in Mixpanel with correct properties before considering it done.

### Mixpanel event template

```dart
// Track [description of what happened] in Mixpanel
if (MixpanelService.isInitialized) {
  MixpanelService.instance.track('event_name', properties: {
    'property_name': value,
    'property_name': value,
  });
}
```

---

## What Not to Do

- **Do not introduce other analytics tools.** This project uses Mixpanel. All tracking goes through Mixpanel.
- **Do not track Mixpanel events on page load** unless explicitly measuring page views. Mixpanel events represent user actions, not navigation.
- **Do not track PII as Mixpanel properties** — no emails, full names, phone numbers, IP addresses, or payment details in Mixpanel event properties.
- **Do not fire Mixpanel events inside loops** — each Mixpanel event call is a network request.
- **Do not hardcode the Mixpanel project token** — read it from environment config (`env.json`).
- **Do not skip `MixpanelService.instance.reset()` on logout** — failing to reset causes Mixpanel to merge the next user's events with the previous user's profile.
- **Do not call `identify()` before the user is authenticated** — premature identification creates orphaned Mixpanel profiles.
