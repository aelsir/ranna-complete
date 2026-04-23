#!/bin/bash

# ============================================
# 🤖 Ranna — Build & Upload to Google Play
# ============================================
#
# Prerequisites:
#   1. Fastlane installed:  brew install fastlane
#   2. Service account JSON: app/private_keys/google-play-service-account.json
#   3. Google Play API enabled + service account linked in Play Console
#
# Usage:
#   make upload-android

set -e

# Ensure we are running from project root
cd "$(dirname "$0")/.."

# ── Preflight checks ──────────────────────────────────────

SERVICE_ACCOUNT_KEY="app/private_keys/google-play-service-account.json"
PACKAGE_NAME="ranna.aelsir.me"

if ! command -v fastlane &> /dev/null; then
    echo "❌ Fastlane is not installed."
    echo "   Install with:  brew install fastlane"
    exit 1
fi

if [ ! -f "$SERVICE_ACCOUNT_KEY" ]; then
    echo "❌ Google Play service account key not found at:"
    echo "   $SERVICE_ACCOUNT_KEY"
    echo ""
    echo "   Follow the setup guide to create one:"
    echo "   1. Google Cloud Console → Create Service Account → Download JSON key"
    echo "   2. Google Play Console → Settings → API access → Link service account"
    echo "   3. Save the JSON file to: $SERVICE_ACCOUNT_KEY"
    exit 1
fi

# ── Version bumping (same UX as iOS script) ───────────────

PUBSPEC="app/pubspec.yaml"
CURRENT_VERSION=$(grep "^version: " $PUBSPEC | awk '{print $2}')
BASE_VERSION=$(echo $CURRENT_VERSION | cut -d '+' -f1)
BUILD_NUMBER=$(echo $CURRENT_VERSION | cut -d '+' -f2)

MAJOR=$(echo $BASE_VERSION | cut -d '.' -f1)
MINOR=$(echo $BASE_VERSION | cut -d '.' -f2)
PATCH=$(echo $BASE_VERSION | cut -d '.' -f3)

echo "=========================================="
echo "🤖 Current Android App Version: $MAJOR.$MINOR.$PATCH (Build $BUILD_NUMBER)"
echo "=========================================="
echo "What kind of update is this?"
echo "  1) 🚀 Big Update (Major)   -> $((MAJOR+1)).0.0"
echo "  2) ✨ Medium Update (Minor)-> $MAJOR.$((MINOR+1)).0"
echo "  3) 🐛 Small Fix (Patch)    -> $MAJOR.$MINOR.$((PATCH+1))"
echo "  4) 📦 Just new Build       -> $MAJOR.$MINOR.$PATCH"
echo ""
read -p "Select option (1-4) [Default: 4]: " choice

NEXT_MAJOR=$MAJOR
NEXT_MINOR=$MINOR
NEXT_PATCH=$PATCH
NEXT_BUILD=$((BUILD_NUMBER + 1))

case $choice in
    1) NEXT_MAJOR=$((MAJOR + 1)); NEXT_MINOR=0; NEXT_PATCH=0 ;;
    2) NEXT_MINOR=$((MINOR + 1)); NEXT_PATCH=0 ;;
    3) NEXT_PATCH=$((PATCH + 1)) ;;
    *) echo "Defaulting to Option 4 (Build bump only)." ;;
esac

NEW_VERSION="$NEXT_MAJOR.$NEXT_MINOR.$NEXT_PATCH+$NEXT_BUILD"
echo ""
echo "✅ Version will be updated to: $NEW_VERSION"

# Update pubspec.yaml
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/^version: .*/version: $NEW_VERSION/" "$PUBSPEC"
else
  sed -i "s/^version: .*/version: $NEW_VERSION/" "$PUBSPEC"
fi

# ── Release notes ─────────────────────────────────────────

echo ""
echo "📝 What is new in this update? (This goes to the Play Store listing)"
read -e -p "> " NOTES

# Save release notes locally
mkdir -p app/release_notes
DATE=$(date +%Y-%m-%d)
NOTE_FILE="app/release_notes/android_v$NEXT_MAJOR.$NEXT_MINOR.$NEXT_PATCH-build$NEXT_BUILD.txt"
echo "Version: $NEW_VERSION" > "$NOTE_FILE"
echo "Date: $DATE" >> "$NOTE_FILE"
echo "What's New:" >> "$NOTE_FILE"
echo "$NOTES" >> "$NOTE_FILE"

echo ""
echo "✅ Release notes saved to $NOTE_FILE"

# ── Select upload track ───────────────────────────────────

echo ""
echo "📦 Which track should this go to?"
echo "  1) 🧪 Internal Testing  (recommended — review first)"
echo "  2) 🔬 Closed Testing    (beta testers)"
echo "  3) 🚀 Production        (live to all users)"
echo ""
read -p "Select track (1-3) [Default: 1]: " track_choice

TRACK="internal"
case $track_choice in
    2) TRACK="beta" ;;
    3) TRACK="production" ;;
    *) TRACK="internal" ;;
esac

echo ""
echo "📡 Upload target: $TRACK"

# ── Build ─────────────────────────────────────────────────

echo ""
echo "⏳ Building Android App Bundle (.aab)... This may take a while."

make sync > /dev/null
cd app && flutter build appbundle --release --dart-define-from-file=env.json --no-tree-shake-icons

AAB_PATH="build/app/outputs/bundle/release/app-release.aab"

if [ ! -f "$AAB_PATH" ]; then
    echo "❌ Build failed — .aab not found at $AAB_PATH"
    exit 1
fi

echo ""
echo "✅ Build complete: $AAB_PATH"

# ── Upload via Fastlane ───────────────────────────────────

echo ""
echo "⏳ Uploading to Google Play ($TRACK track)..."

# Create a temporary changelogs directory for Fastlane
CHANGELOG_DIR=$(mktemp -d)
mkdir -p "$CHANGELOG_DIR/changelogs"
# ar = Arabic, default = fallback
echo "$NOTES" > "$CHANGELOG_DIR/changelogs/default.txt"
echo "$NOTES" > "$CHANGELOG_DIR/changelogs/ar.txt"

fastlane supply \
    --aab "$AAB_PATH" \
    --track "$TRACK" \
    --package_name "$PACKAGE_NAME" \
    --json_key "../$SERVICE_ACCOUNT_KEY" \
    --release_status "completed" \
    --metadata_path "$CHANGELOG_DIR" \
    --skip_upload_metadata true \
    --skip_upload_images true \
    --skip_upload_screenshots true

# Cleanup temp dir
rm -rf "$CHANGELOG_DIR"

echo ""
echo "=========================================="
echo "🎉 Upload Successful!"
echo "=========================================="
echo ""
echo "  Version:  $NEW_VERSION"
echo "  Track:    $TRACK"
echo "  Package:  $PACKAGE_NAME"
echo ""

if [ "$TRACK" = "internal" ]; then
    echo "  📱 Next: Open Google Play Console → Testing → Internal Testing"
    echo "     → Promote to production when ready."
elif [ "$TRACK" = "beta" ]; then
    echo "  📱 Next: Open Google Play Console → Testing → Closed Testing"
    echo "     → Promote to production when ready."
else
    echo "  🚀 Your update is now live on Google Play!"
fi

echo ""
