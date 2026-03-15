#!/usr/bin/env bash
# check-type-drift.sh
#
# CI guard: verifies that no TypeScript type in frontend/src/domains/ duplicates a
# canonical type already exported from frontend/src/types/, and that no auto-generated
# type in frontend/src/lib/backend/ has been manually edited to diverge from its
# Rust source definition.
#
# Usage:
#   ./scripts/check-type-drift.sh
#
# Exit codes:
#   0 – no drift detected
#   1 – drift detected (see output for details)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔍  Running type drift check…"
echo ""

# Run the Node.js duplicate-type validator (npm run types:validate).
cd "$ROOT_DIR"
node scripts/validate-types.js
STATUS=$?

if [ $STATUS -ne 0 ]; then
  echo ""
  echo "❌  Type drift detected. Fix the issues above, then re-run:"
  echo "    npm run types:validate"
  exit 1
fi

echo ""
echo "✅  Type drift check passed."
exit 0