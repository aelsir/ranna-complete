#!/bin/bash
# Auto-increment build number, build IPA, and upload to App Store Connect.
#
# Usage:
#   ./deploy.sh                  # Build + upload
#   ./deploy.sh --build-only     # Build only (no upload)
#
# Requires: API key in ~/.private_keys/AuthKey_XXXXXXXX.p8
# Set these once:
API_KEY="YOUR_KEY_ID"
API_ISSUER="YOUR_ISSUER_ID"

set -e
cd "$(dirname "$0")"

# ── Auto-increment build number ──
PUBSPEC="pubspec.yaml"
CURRENT=$(grep '^version:' "$PUBSPEC" | sed 's/.*+//')
NEXT=$((CURRENT + 1))
VERSION=$(grep '^version:' "$PUBSPEC" | sed 's/+.*//' | sed 's/version: //')

sed -i '' "s/^version: .*/version: ${VERSION}+${NEXT}/" "$PUBSPEC"
echo "📦 Version: ${VERSION}+${NEXT} (was +${CURRENT})"

# ── Build IPA ──
echo "🔨 Building..."
flutter build ipa --release --dart-define-from-file=env.json

IPA_FILE=$(ls build/ios/ipa/*.ipa 2>/dev/null | head -1)
if [ -z "$IPA_FILE" ]; then
  echo "❌ No IPA found"
  exit 1
fi
echo "✅ Built: $IPA_FILE"

# ── Upload ──
if [ "$1" = "--build-only" ]; then
  echo "⏭️  Skipping upload (--build-only)"
  exit 0
fi

echo "🚀 Uploading to App Store Connect..."
xcrun altool --upload-app --type ios \
  --file "$IPA_FILE" \
  --apiKey "$API_KEY" \
  --apiIssuer "$API_ISSUER"

echo "✅ Uploaded! Check TestFlight in ~10 minutes."
