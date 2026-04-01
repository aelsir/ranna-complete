SHARED_DIR := $(CURDIR)/shared
APP_ASSETS := $(CURDIR)/app/assets
WEB_ASSETS := $(CURDIR)/web/src/assets

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
dev-app: sync
	cd app && flutter run --dart-define-from-file=env.json

## Install the Flutter app in release mode on a connected iPhone (works independently)
release-app: sync
	cd app && flutter install --release


## Build the iOS app for App Store / TestFlight distribution
build-ipa: sync
	cd app && flutter build ipa --release --dart-define-from-file=env.json --export-method app-store
