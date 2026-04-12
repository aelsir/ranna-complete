#!/bin/bash

# Ensure we are running from project root
cd "$(dirname "$0")/.."

# Check if .env is loaded (fallback if Makefile didn't pass it)
if [ -z "$ISSUER_ID" ]; then
    if [ -f ".env" ]; then
        ISSUER_ID=$(grep -E '^APPLE_API_ISSUER=' .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    fi
fi

if [ -z "$ISSUER_ID" ]; then
    echo "❌ Error: ISSUER_ID is not set in .env as APPLE_API_ISSUER."
    exit 1
fi

PUBSPEC="app/pubspec.yaml"
CURRENT_VERSION=$(grep "^version: " $PUBSPEC | awk '{print $2}')
# Format is x.y.z+b
BASE_VERSION=$(echo $CURRENT_VERSION | cut -d '+' -f1)
BUILD_NUMBER=$(echo $CURRENT_VERSION | cut -d '+' -f2)

MAJOR=$(echo $BASE_VERSION | cut -d '.' -f1)
MINOR=$(echo $BASE_VERSION | cut -d '.' -f2)
PATCH=$(echo $BASE_VERSION | cut -d '.' -f3)

echo "=========================================="
echo "🍏 Current App Version: $MAJOR.$MINOR.$PATCH (Build $BUILD_NUMBER)"
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

# Use sed to replace the version in pubspec.yaml securely
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/^version: .*/version: $NEW_VERSION/" "$PUBSPEC"
else
  sed -i "s/^version: .*/version: $NEW_VERSION/" "$PUBSPEC"
fi

echo ""
echo "📝 What is new in this update? (Write a quick summary)"
read -e -p "> " NOTES

# Save release notes for their reference
mkdir -p app/release_notes
DATE=$(date +%Y-%m-%d)
NOTE_FILE="app/release_notes/v$NEXT_MAJOR.$NEXT_MINOR.$NEXT_PATCH-build$NEXT_BUILD.txt"
echo "Version: $NEW_VERSION" > "$NOTE_FILE"
echo "Date: $DATE" >> "$NOTE_FILE"
echo "What's New:" >> "$NOTE_FILE"
echo "$NOTES" >> "$NOTE_FILE"

echo ""
echo "✅ Release notes saved locally to $NOTE_FILE"
echo "⚠️ Note: Apple requires you to paste these notes manually into App Store Connect when submitting."
echo ""
echo "⏳ Building and uploading to iOS... This may take a while."

# Run the build standard command
make build-ipa

# Prepare Keys for Apple 
mkdir -p ~/.appstoreconnect/private_keys
if [ -f "app/private_keys/AuthKey_76KGJ269A6.p8" ]; then
    cp "app/private_keys/AuthKey_76KGJ269A6.p8" ~/.appstoreconnect/private_keys/
fi

cd app && xcrun altool --upload-app -f "build/ios/ipa/ranna.ipa" -t ios --apiKey "76KGJ269A6" --apiIssuer "$ISSUER_ID"
