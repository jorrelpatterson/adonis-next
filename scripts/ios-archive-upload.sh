#!/usr/bin/env bash
# Archive Adonis for iOS and upload to TestFlight/App Store Connect.
# Prereqs: Apple Developer account signed into Xcode (done), bundle pro.adonis.app
# registered (done), an App Store Connect app record for pro.adonis.app (see below),
# and an App Store Connect API key for the upload.
#
#   1. In App Store Connect → Apps → +  → New App: name "Adonis", bundle pro.adonis.app,
#      SKU adonis-ios, primary language English. (One-time.)
#   2. App Store Connect → Users and Access → Integrations → App Store Connect API →
#      generate a key (App Manager role). Download the .p8, note the Key ID + Issuer ID.
#   3. Put the key at ~/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8 (or pass --apiKey).
#   4. Run this script with ASC_KEY_ID / ASC_ISSUER_ID set.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
ARCHIVE="${ARCHIVE:-/tmp/Adonis.xcarchive}"
npm run build:ios && npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" archive -allowProvisioningUpdates
xcodebuild -exportArchive -archivePath "$ARCHIVE" \
  -exportOptionsPlist ios/ExportOptions.plist -exportPath /tmp/Adonis-export -allowProvisioningUpdates
# Upload the .ipa. Needs ASC_KEY_ID + ASC_ISSUER_ID (+ the .p8 in the standard path).
IPA=$(ls /tmp/Adonis-export/*.ipa | head -1)
xcrun altool --upload-app -f "$IPA" -t ios \
  --apiKey "${ASC_KEY_ID:?set ASC_KEY_ID}" --apiIssuer "${ASC_ISSUER_ID:?set ASC_ISSUER_ID}"
echo "Uploaded $IPA to App Store Connect → TestFlight (processing takes a few min)."
