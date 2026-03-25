SHARED_ICONS := shared/icons
APP_ICONS    := app/assets/icons
WEB_ICONS    := web/src/assets/icons

.PHONY: sync dev-web dev-app

## Sync shared icons to app and web
sync:
	@mkdir -p $(APP_ICONS) $(WEB_ICONS)
	@[ "$$(ls -A $(SHARED_ICONS) 2>/dev/null)" ] && cp -R $(SHARED_ICONS)/. $(APP_ICONS)/ && cp -R $(SHARED_ICONS)/. $(WEB_ICONS)/ || true
	@echo "✅ Icons synced"

## Start the web app (syncs icons first)
dev-web: sync
	cd web && npm run dev

## Start the Flutter app (syncs icons first)
dev-app: sync
	cd app && flutter run --dart-define-from-file=env.json
