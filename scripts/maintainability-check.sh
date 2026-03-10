#!/usr/bin/env bash
# scripts/maintainability-check.sh
#
# Runs maintainability checks and reports a delta of tech-debt indicators
# (TODO / FIXME / unwrap()) compared with the last git commit.
#
# Usage:
#   bash scripts/maintainability-check.sh [--strict]
#
# Exit codes:
#   0 – all checks passed (delta report is informational only)
#   1 – one or more checks failed

set -euo pipefail

STRICT=false
for arg in "$@"; do
  [ "$arg" = "--strict" ] && STRICT=true
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ─── Colour helpers ───────────────────────────────────────────────────────────
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

pass() { echo -e "${GREEN}✓${RESET} $*"; }
fail() { echo -e "${RED}❌${RESET} $*"; }
info() { echo -e "${CYAN}ℹ${RESET} $*"; }
header() { echo -e "\n${BOLD}$*${RESET}"; }

OVERALL_EXIT=0

# ─── 1. Backend module boundary check ────────────────────────────────────────
header "1/3 · Backend module boundary check"
if node scripts/enforce-backend-module-boundaries.js; then
  pass "Backend module boundaries are clean."
else
  fail "Backend module boundary violations found."
  OVERALL_EXIT=1
fi

# ─── 2. Architecture check ───────────────────────────────────────────────────
header "2/3 · Architecture check"
ARCH_FLAGS="--strict"
if node scripts/architecture-check.js $ARCH_FLAGS; then
  pass "Architecture check passed."
else
  fail "Architecture violations found."
  OVERALL_EXIT=1
fi

# ─── 3. Tech-debt delta: TODO / FIXME / unwrap() ────────────────────────────
header "3/3 · Tech-debt indicator delta (vs last commit)"

# Patterns to search for, comma-separated label:pattern pairs
declare -A PATTERNS
PATTERNS["TODO"]="TODO"
PATTERNS["FIXME"]="FIXME"
PATTERNS["unwrap()"]='\.unwrap\(\)'

# Directories to scan
SCAN_DIRS=("src-tauri/src" "frontend/src")

count_occurrences() {
  local pattern="$1"
  local total=0
  for dir in "${SCAN_DIRS[@]}"; do
    if [ -d "$dir" ]; then
      local n
      n=$(grep -rE --include="*.rs" --include="*.ts" --include="*.tsx" \
           "$pattern" "$dir" 2>/dev/null \
           | wc -l)
      total=$((total + n))
    fi
  done
  echo "$total"
}

count_in_ref() {
  local ref="$1"
  local pattern="$2"
  local total=0
  for dir in "${SCAN_DIRS[@]}"; do
    local n=0
    while IFS= read -r file; do
      [ -z "$file" ] && continue
      c=$(git show "${ref}:${file}" 2>/dev/null \
            | grep -cE "$pattern" 2>/dev/null || true)
      n=$((n + c))
    done < <(git ls-tree -r --name-only "$ref" -- "$dir" 2>/dev/null \
               | grep -E '\.(rs|ts|tsx)$')
    total=$((total + n))
  done
  echo "$total"
}

# Determine the reference commit (HEAD if available, else skip delta)
HAVE_COMMITS=true
if ! git rev-parse --verify HEAD > /dev/null 2>&1; then
  HAVE_COMMITS=false
fi

printf "\n  %-15s %8s %8s %8s\n" "Indicator" "HEAD" "Working" "Delta"
printf "  %-15s %8s %8s %8s\n" "---------" "------" "-------" "-----"

DELTA_TOTAL=0

for label in "TODO" "FIXME" "unwrap()"; do
  pattern="${PATTERNS[$label]}"

  current=$(count_occurrences "$pattern")

  if $HAVE_COMMITS; then
    previous=$(count_in_ref "HEAD" "$pattern")
  else
    previous="$current"
  fi

  delta=$((current - previous))
  DELTA_TOTAL=$((DELTA_TOTAL + delta))

  if [ "$delta" -gt 0 ]; then
    colour="${RED}"
    symbol="▲ +${delta}"
  elif [ "$delta" -lt 0 ]; then
    colour="${GREEN}"
    symbol="▼ ${delta}"
  else
    colour="${RESET}"
    symbol="  0"
  fi

  printf "  %-15s %8s %8s ${colour}%8s${RESET}\n" \
    "$label" "$previous" "$current" "$symbol"
done

echo ""

if [ "$DELTA_TOTAL" -gt 0 ]; then
  echo -e "${YELLOW}⚠  Tech-debt increased by ${DELTA_TOTAL} occurrence(s) in this working tree.${RESET}"
  if $STRICT; then
    fail "Strict mode: tech-debt increases are not allowed."
    OVERALL_EXIT=1
  fi
elif [ "$DELTA_TOTAL" -lt 0 ]; then
  pass "Tech-debt decreased by $((- DELTA_TOTAL)) occurrence(s). 🎉"
else
  pass "No change in tech-debt indicators."
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
if [ "$OVERALL_EXIT" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}All maintainability checks passed.${RESET}"
else
  echo -e "${RED}${BOLD}One or more maintainability checks failed.${RESET}"
fi

exit "$OVERALL_EXIT"
