SHARED_DIR := $(CURDIR)/shared
APP_ASSETS := $(CURDIR)/app/assets
WEB_ASSETS := $(CURDIR)/web/src/assets

# Load .env file variables
-include .env
export $(shell [ -f .env ] && sed 's/=.*//' .env)

# Default Issuer ID from .env if not provided on command line
ISSUER_ID ?= $(APPLE_API_ISSUER)

# ─────────────────────────────────────────────
# Internal-device flag (analytics hygiene)
# ─────────────────────────────────────────────
# Passed only to local dev / founder-iPhone builds (dev-app, release-app).
# When set, the Flutter audio player short-circuits recordPlay and
# increment_play_count so founder/dev listening doesn't pollute the
# user_plays or tracks.play_count analytics. See migration 036 +
# app/README.md for the full design.
#
# CRITICAL: Production / distribution targets (build-aab, upload-ios,
# upload-android, build-ipa, build-apk) must NOT include this flag —
# real users need their plays recorded normally.
INTERNAL_DEVICE_FLAG := --dart-define=INTERNAL_DEVICE=true


# List of asset directories to link
ASSET_DIRS := icons images fonts

.PHONY: sync dev-web dev-app

## Ensure symlinks for shared assets exist in app and web
sync:
	@for dir in $(ASSET_DIRS); do \
		mkdir -p $(SHARED_DIR)/$$dir; \
		if [ -d $(APP_ASSETS)/$$dir ] && [ ! -L $(APP_ASSETS)/$$dir ]; then \
			rm -rf $(APP_ASSETS)/$$dir; \
		fi; \
		if [ ! -L $(APP_ASSETS)/$$dir ]; then \
			ln -s $(SHARED_DIR)/$$dir $(APP_ASSETS)/$$dir; \
			echo "🔗 Linked $(APP_ASSETS)/$$dir"; \
		fi; \
		if [ -d $(WEB_ASSETS)/$$dir ] && [ ! -L $(WEB_ASSETS)/$$dir ]; then \
			rm -rf $(WEB_ASSETS)/$$dir; \
		fi; \
		if [ ! -L $(WEB_ASSETS)/$$dir ]; then \
			ln -s $(SHARED_DIR)/$$dir $(WEB_ASSETS)/$$dir; \
			echo "🔗 Linked $(WEB_ASSETS)/$$dir"; \
		fi; \
	done
	@echo "✅ Assets are automatically synced via symlinks"

## Start the web app (ensures links first)
dev-web: sync
	cd web && npm run dev

## Start the Flutter app (ensures links first)
## Includes INTERNAL_DEVICE flag — listening on this device does NOT touch
## user_plays / tracks.play_count. Production builds below omit the flag.
dev-app: sync
	cd app && flutter run --dart-define-from-file=env.json $(INTERNAL_DEVICE_FLAG)

## Install the Flutter app in release mode on a connected iPhone (founder's
## device). Includes INTERNAL_DEVICE flag — same analytics-hygiene rule as
## dev-app. Use upload-ios for App Store / TestFlight distribution to real users.
release-app: sync
	cd app && flutter clean && flutter build ios --release --dart-define-from-file=env.json $(INTERNAL_DEVICE_FLAG) --no-tree-shake-icons && flutter install --release

## Build Android App Bundle (.aab) for Google Play Store with Version Bumping
build-aab:
	@bash scripts/build_android.sh

## Upload to App Store Connect (TestFlight & App Store)
## Usage: make upload-ios (Interactive version bump + upload)
upload-ios:
	@bash scripts/upload_ios.sh

## Upload to Google Play (Internal/Beta/Production)
## Usage: make upload-android (Interactive version bump + upload)
upload-android:
	@bash scripts/upload_android.sh



## Not very useful for now

## Build the iOS app for App Store / TestFlight distribution
build-ipa: sync
	cd app && flutter build ipa --release --dart-define-from-file=env.json --export-method app-store --no-tree-shake-icons

## Build Android APK for direct distribution
build-apk: sync
	cd app && flutter build apk --release --dart-define-from-file=env.json
