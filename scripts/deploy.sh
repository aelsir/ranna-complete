#!/bin/bash

# ============================================
# 🚀 Ranna — Unified Deploy to App Store + Google Play
# ============================================
#
# One command to rule them all:
#   make deploy           → Deploy to both iOS + Android
#   make deploy-ios       → Deploy to iOS only
#   make deploy-android   → Deploy to Android only
#
# This script:
#   1. Bumps version ONCE (consistent across platforms)
#   2. Collects release notes ONCE (shared across platforms)
#   3. Builds + uploads to selected platform(s)
#   4. Commits the version bump + release notes
#
# Prerequisites:
#   - Fastlane installed: brew install fastlane
#   - Apple API key: app/private_keys/AuthKey_76KGJ269A6.p8
#   - Google service account: app/private_keys/google-play-service-account.json
#   - APPLE_API_ISSUER set in .env

set -e

# ── Setup ─────────────────────────────────────────────────
cd "$(dirname "$0")/.."

# Parse target platform from argument
TARGET="${1:-both}"  # "ios", "android", or "both"

# ── Preflight checks ─────────────────────────────────────

PUBSPEC="app/pubspec.yaml"
SERVICE_ACCOUNT_KEY="app/private_keys/google-play-service-account.json"
APPLE_KEY_FILE="app/private_keys/AuthKey_76KGJ269A6.p8"
PACKAGE_NAME="ranna.aelsir.me"

# Load .env
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

ISSUER_ID="${APPLE_API_ISSUER:-}"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║       🚀 Ranna Deployment Pipeline       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check platform-specific prerequisites
if [[ "$TARGET" == "ios" || "$TARGET" == "both" ]]; then
    if [ -z "$ISSUER_ID" ]; then
        echo "❌ APPLE_API_ISSUER not set in .env"
        exit 1
    fi
    if [ ! -f "$APPLE_KEY_FILE" ]; then
        echo "❌ Apple API key not found at: $APPLE_KEY_FILE"
        exit 1
    fi
    echo "  ✅ iOS prerequisites OK"
fi

if [[ "$TARGET" == "android" || "$TARGET" == "both" ]]; then
    if ! command -v fastlane &> /dev/null; then
        echo "❌ Fastlane is not installed. Install with: brew install fastlane"
        exit 1
    fi
    if [ ! -f "$SERVICE_ACCOUNT_KEY" ]; then
        echo "❌ Google Play service account key not found at: $SERVICE_ACCOUNT_KEY"
        exit 1
    fi
    echo "  ✅ Android prerequisites OK"
fi

# ── Version Bump (once, shared) ──────────────────────────

CURRENT_VERSION=$(grep "^version: " $PUBSPEC | awk '{print $2}')
BASE_VERSION=$(echo $CURRENT_VERSION | cut -d '+' -f1)
BUILD_NUMBER=$(echo $CURRENT_VERSION | cut -d '+' -f2)

MAJOR=$(echo $BASE_VERSION | cut -d '.' -f1)
MINOR=$(echo $BASE_VERSION | cut -d '.' -f2)
PATCH=$(echo $BASE_VERSION | cut -d '.' -f3)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📱 Current Version: $MAJOR.$MINOR.$PATCH (Build $BUILD_NUMBER)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  What kind of update is this?"
echo ""
echo "    1) 🚀 Big Update (Major)   → $((MAJOR+1)).0.0"
echo "    2) ✨ New Feature (Minor)  → $MAJOR.$((MINOR+1)).0"
echo "    3) 🐛 Bug Fix (Patch)     → $MAJOR.$MINOR.$((PATCH+1))"
echo "    4) 📦 Build bump only     → $MAJOR.$MINOR.$PATCH"
echo ""
read -p "  Select (1-4) [Default: 4]: " choice

NEXT_MAJOR=$MAJOR
NEXT_MINOR=$MINOR
NEXT_PATCH=$PATCH
NEXT_BUILD=$((BUILD_NUMBER + 1))

case $choice in
    1) NEXT_MAJOR=$((MAJOR + 1)); NEXT_MINOR=0; NEXT_PATCH=0 ;;
    2) NEXT_MINOR=$((MINOR + 1)); NEXT_PATCH=0 ;;
    3) NEXT_PATCH=$((PATCH + 1)) ;;
    *) ;;
esac

NEW_VERSION="$NEXT_MAJOR.$NEXT_MINOR.$NEXT_PATCH+$NEXT_BUILD"

echo ""
echo "  ✅ New version: $NEW_VERSION"

# Update pubspec.yaml
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/^version: .*/version: $NEW_VERSION/" "$PUBSPEC"
else
    sed -i "s/^version: .*/version: $NEW_VERSION/" "$PUBSPEC"
fi

# ── Release Notes (once, shared) ─────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📝 Release Notes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  What's new in this release?"
echo "  (This goes to both App Store + Google Play)"
echo ""
read -e -p "  > " NOTES

# Save unified release notes
mkdir -p app/release_notes
DATE=$(date +%Y-%m-%d)
NOTE_FILE="app/release_notes/v$NEXT_MAJOR.$NEXT_MINOR.$NEXT_PATCH-build$NEXT_BUILD.txt"

cat > "$NOTE_FILE" << EOF
Version: $NEW_VERSION
Date: $DATE
Platform: $(echo $TARGET | tr '[:lower:]' '[:upper:]')
What's New:
$NOTES
EOF

echo ""
echo "  ✅ Release notes saved: $NOTE_FILE"

# ── Sync shared assets ────────────────────────────────────

echo ""
echo "⏳ Syncing shared assets..."
make sync > /dev/null

# ── Android track selection ───────────────────────────────

ANDROID_TRACK="internal"
if [[ "$TARGET" == "android" || "$TARGET" == "both" ]]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  🤖 Android Track"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "    1) 🧪 Internal Testing  (recommended)"
    echo "    2) 🔬 Closed Testing    (beta testers)"
    echo "    3) 🚀 Production        (live to all)"
    echo ""
    read -p "  Select track (1-3) [Default: 1]: " track_choice

    case $track_choice in
        2) ANDROID_TRACK="beta" ;;
        3) ANDROID_TRACK="production" ;;
        *) ANDROID_TRACK="internal" ;;
    esac

    echo ""
    echo "  📡 Android track: $ANDROID_TRACK"
fi

# ── Build + Upload iOS ────────────────────────────────────

if [[ "$TARGET" == "ios" || "$TARGET" == "both" ]]; then
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║         🍏 Building iOS (.ipa)           ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""

    cd app && flutter build ipa --release \
        --dart-define-from-file=env.json \
        --export-method app-store \
        --no-tree-shake-icons

    IPA_FILE=$(ls build/ios/ipa/*.ipa 2>/dev/null | head -1)
    if [ -z "$IPA_FILE" ]; then
        echo "❌ iOS build failed — no .ipa found"
        exit 1
    fi

    echo ""
    echo "✅ iOS build complete: $IPA_FILE"
    echo ""
    echo "⏳ Uploading to App Store Connect..."

    # Ensure API key is in place
    mkdir -p ~/.appstoreconnect/private_keys
    cp "../$APPLE_KEY_FILE" ~/.appstoreconnect/private_keys/ 2>/dev/null || true

    xcrun altool --upload-app \
        -f "$IPA_FILE" \
        -t ios \
        --apiKey "76KGJ269A6" \
        --apiIssuer "$ISSUER_ID"

    echo ""
    echo "  ✅ iOS uploaded to App Store Connect!"
    echo "     → Check TestFlight in ~10 minutes"

    cd ..
fi

# ── Build + Upload Android ────────────────────────────────

if [[ "$TARGET" == "android" || "$TARGET" == "both" ]]; then
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║       🤖 Building Android (.aab)         ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""

    cd app && flutter build appbundle --release \
        --dart-define-from-file=env.json \
        --no-tree-shake-icons

    AAB_PATH="build/app/outputs/bundle/release/app-release.aab"

    if [ ! -f "$AAB_PATH" ]; then
        echo "❌ Android build failed — .aab not found at $AAB_PATH"
        exit 1
    fi

    echo ""
    echo "✅ Android build complete: $AAB_PATH"
    echo ""
    echo "⏳ Uploading to Google Play ($ANDROID_TRACK track)..."

    # Create changelog directory for Fastlane supply
    CHANGELOG_DIR=$(mktemp -d)
    mkdir -p "$CHANGELOG_DIR/ar/changelogs"
    mkdir -p "$CHANGELOG_DIR/en-US/changelogs"
    echo "$NOTES" > "$CHANGELOG_DIR/ar/changelogs/$NEXT_BUILD.txt"
    echo "$NOTES" > "$CHANGELOG_DIR/en-US/changelogs/$NEXT_BUILD.txt"

    fastlane supply \
        --aab "$AAB_PATH" \
        --track "$ANDROID_TRACK" \
        --package_name "$PACKAGE_NAME" \
        --json_key "../$SERVICE_ACCOUNT_KEY" \
        --release_status "completed" \
        --metadata_path "$CHANGELOG_DIR" \
        --skip_upload_metadata true \
        --skip_upload_images true \
        --skip_upload_screenshots true

    rm -rf "$CHANGELOG_DIR"

    echo ""
    echo "  ✅ Android uploaded to Google Play ($ANDROID_TRACK)!"

    cd ..
fi

# ── Git commit the version bump ───────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📦 Version Commit"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "  Commit version bump to git? (y/N): " commit_choice

if [[ "$commit_choice" =~ ^[Yy]$ ]]; then
    git add "$PUBSPEC" "$NOTE_FILE"
    git commit -m "release: v$NEXT_MAJOR.$NEXT_MINOR.$NEXT_PATCH+$NEXT_BUILD — $NOTES"
    git tag "v$NEXT_MAJOR.$NEXT_MINOR.$NEXT_PATCH-build$NEXT_BUILD"
    echo "  ✅ Committed + tagged: v$NEXT_MAJOR.$NEXT_MINOR.$NEXT_PATCH-build$NEXT_BUILD"
fi

# ── Summary ───────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║         🎉 Deployment Complete!           ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Version:   $NEW_VERSION"
echo "  Notes:     $NOTES"
echo "  Date:      $DATE"
echo ""

if [[ "$TARGET" == "ios" || "$TARGET" == "both" ]]; then
    echo "  🍏 iOS:     Uploaded → App Store Connect / TestFlight"
fi
if [[ "$TARGET" == "android" || "$TARGET" == "both" ]]; then
    echo "  🤖 Android: Uploaded → Google Play ($ANDROID_TRACK track)"
fi

echo ""
echo "  📄 Release notes: $NOTE_FILE"
echo ""
