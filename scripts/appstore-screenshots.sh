#!/usr/bin/env bash
# App Store screenshots at the 6.7"/6.9" required size (1290x2796).
# iPhone 15/16 Pro Max = 430x932 pt @3x = 1290x2796 px. We render the app's
# real mobile layout at logical 430x932 with device-scale-factor 3 → crisp @3x.
# Uses the dev server + the DEV-only ?e2e bypass to reach each screen headlessly.
#   npm run dev:app -- --port 4321 --strictPort   (in another shell)
#   scripts/appstore-screenshots.sh
set -euo pipefail
BASE_URL="${BASE_URL:-http://localhost:4321}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/docs/appstore/screenshots"
# hero screens, ordered as they'd appear in the listing
ROUTES=(
  "/?screen=onboarding|01-onboarding"
  "/?e2e=1&tab=home|02-home"
  "/?e2e=1&tab=routine|03-routine"
  "/?e2e=1&tab=body|04-body-peptides"
  "/?e2e=1&tab=money|05-money"
  "/?e2e=1&tab=purpose|06-bucket-list"
  "/?e2e=1&tab=insights|07-insights"
  "/?e2e=1&tab=mind|08-mind"
)
curl -sf -o /dev/null "$BASE_URL/" || { echo "no dev server at $BASE_URL — run: npm run dev:app -- --port 4321 --strictPort" >&2; exit 1; }
mkdir -p "$OUT"
for entry in "${ROUTES[@]}"; do
  route="${entry%%|*}"; name="${entry##*|}"
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=3 --window-size=430,932 \
    --virtual-time-budget=9000 --screenshot="$OUT/$name.png" \
    "$BASE_URL$route" 2>/dev/null
  # verify it's the 6.7" size
  sz=$(sips -g pixelWidth -g pixelHeight "$OUT/$name.png" 2>/dev/null | awk '/pixel/{print $2}' | paste -sd x -)
  echo "shot $name.png  ($sz)"
done
echo "App Store screenshots (1290x2796) written to docs/appstore/screenshots/"
