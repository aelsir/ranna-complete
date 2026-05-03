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
# CRITICAL: Production / distribution targets (deploy, deploy-ios,
# deploy-android, build-aab, build-ipa) must NOT include this flag —
# real users need their plays recorded normally.
INTERNAL_DEVICE_FLAG := --dart-define=INTERNAL_DEVICE=true


# List of asset directories to link
ASSET_DIRS := icons images fonts

.PHONY: sync dev-web dev-app release-app release-ios release-android \
        deploy deploy-ios deploy-android \
        build-aab build-ipa build-apk \
        upload-ios upload-android

# ═════════════════════════════════════════════
# Asset sync
# ═════════════════════════════════════════════

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

# ═════════════════════════════════════════════
# Local development
# ═════════════════════════════════════════════

## Start the web app (ensures links first)
dev-web: sync
	cd web && npm run dev

## Start the Flutter app (ensures links first)
## Includes INTERNAL_DEVICE flag — listening on this device does NOT touch
## user_plays / tracks.play_count. Production builds below omit the flag.
dev-app: sync
	cd app && flutter run --dart-define-from-file=env.json $(INTERNAL_DEVICE_FLAG)

# ═════════════════════════════════════════════
# Local release install (founder's device)
# ═════════════════════════════════════════════

## Install the Flutter app in release mode on a connected device.
## Auto-detects whether iOS or Android device is connected.
## Includes INTERNAL_DEVICE flag — analytics-hygiene rule.
## For store distribution, use: make deploy
release-app: sync
	@echo "🔍 Detecting connected device..."
	@if flutter devices 2>/dev/null | grep -qi "android"; then \
		echo "🤖 Android device detected"; \
		$(MAKE) release-android; \
	elif flutter devices 2>/dev/null | grep -qi "iphone\|ipad\|ios"; then \
		echo "🍏 iOS device detected"; \
		$(MAKE) release-ios; \
	else \
		echo "❌ No physical device connected. Connect an iPhone or Android phone."; \
		echo "   Detected devices:"; \
		cd app && flutter devices; \
		exit 1; \
	fi

## Install release build on a connected iOS device (founder's device)
release-ios: sync
	cd app && flutter clean && \
		flutter build ios --release \
			--dart-define-from-file=env.json \
			$(INTERNAL_DEVICE_FLAG) \
			--no-tree-shake-icons && \
		flutter install --release

## Install release build on a connected Android device (founder's device)
release-android: sync
	cd app && flutter clean && \
		flutter build apk --release \
			--dart-define-from-file=env.json \
			$(INTERNAL_DEVICE_FLAG) \
			--no-tree-shake-icons && \
		flutter install --release

# ═════════════════════════════════════════════
# 🚀 Store deployment (unified pipeline)
# ═════════════════════════════════════════════

## Deploy to BOTH App Store + Google Play in one command.
## Bumps version once, writes shared release notes, builds & uploads both.
deploy:
	@bash scripts/deploy.sh both

## Deploy to iOS App Store / TestFlight only
deploy-ios:
	@bash scripts/deploy.sh ios

## Deploy to Google Play only
deploy-android:
	@bash scripts/deploy.sh android

# ═════════════════════════════════════════════
# Legacy / standalone build targets
# ═════════════════════════════════════════════

## Build Android App Bundle (.aab) for Google Play Store with Version Bumping
build-aab:
	@bash scripts/build_android.sh

## Upload to App Store Connect (standalone — prefer `make deploy-ios`)
upload-ios:
	@bash scripts/upload_ios.sh

## Upload to Google Play (standalone — prefer `make deploy-android`)
upload-android:
	@bash scripts/upload_android.sh

## Build the iOS app for App Store / TestFlight distribution
build-ipa: sync
	cd app && flutter build ipa --release --dart-define-from-file=env.json --export-method app-store --no-tree-shake-icons

## Build Android APK for direct distribution
build-apk: sync
	cd app && flutter build apk --release --dart-define-from-file=env.json --no-tree-shake-icons
