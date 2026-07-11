#!/usr/bin/env bash
# Visual-baseline shooter for the v2 app (spec Verification addendum 2026-07-09).
# Shoots every route in ROUTES at phone viewport into docs/visual-baselines/<label>/.
#
# Usage:
#   scripts/screenshot-baseline.sh <label>            # e.g. phase-1
#   BASE_URL=http://localhost:4321 scripts/screenshot-baseline.sh phase-2
#
# Requires a running dev server (npm run dev:app) and Google Chrome.
# Compare against the prior phase's folder by eye or with:
#   for f in docs/visual-baselines/<new>/*.png; do compare -metric AE "$f" "docs/visual-baselines/<old>/$(basename "$f")" null: ; done
#
# Task 14 shipped the dev/E2E URL-param bypass (App.jsx, DEV-only —
# `?e2e=1` seeds a complete profile + skips auth/onboarding, `&tab=` picks
# the initial tab, `?screen=onboarding|auth` forces those screens
# unauthenticated) so every inner screen is now reachable headlessly.

set -euo pipefail

LABEL="${1:?usage: screenshot-baseline.sh <label> (e.g. phase-1)}"
BASE_URL="${BASE_URL:-http://localhost:5173}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$REPO_ROOT/docs/visual-baselines/$LABEL"

# route (URL path or #hash) -> output name
ROUTES=(
  "/?screen=onboarding|onboarding-step0"
  "/?screen=auth|auth"
  "/?e2e=1&tab=routine|routine"
  "/?e2e=1&tab=body|body"
  "/?e2e=1&tab=profile|profile"
)

if ! curl -sf -o /dev/null "$BASE_URL/"; then
  echo "ERROR: no dev server at $BASE_URL — start with: npm run dev:app" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

for entry in "${ROUTES[@]}"; do
  route="${entry%%|*}"
  name="${entry##*|}"
  out="$OUT_DIR/$name.png"
  "$CHROME" --headless --disable-gpu \
    --window-size=430,932 \
    --virtual-time-budget=8000 \
    --screenshot="$out" \
    "$BASE_URL$route" 2>/dev/null
  echo "shot: $name.png  ($BASE_URL$route)"
done

echo "baseline written to docs/visual-baselines/$LABEL/"
