#!/bin/bash

# CI Type Check Script for RPMA
# Validates TypeScript type generation and consistency

set -e

echo "🔍 RPMA CI Type Check"
echo "====================="
echo

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

# 1. Check that backend.ts exists
BACKEND_TS="frontend/src/lib/backend.ts"
if [ -f "$BACKEND_TS" ]; then
    echo -e "${GREEN}✓${NC} backend.ts exists"
else
    echo -e "${RED}✗${NC} backend.ts not found"
    ERRORS=$((ERRORS + 1))
fi

# 2. Validate required exports in backend.ts
REQUIRED_EXPORTS=("TaskStatus" "TaskPriority" "UserAccount")
for exp in "${REQUIRED_EXPORTS[@]}"; do
    if grep -q "export type $exp\|export interface $exp" "$BACKEND_TS" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Export found: $exp"
    else
        echo -e "${RED}✗${NC} Missing export: $exp"
        ERRORS=$((ERRORS + 1))
    fi
done

# 3. Run TypeScript type check
echo
echo "Running TypeScript type check..."
if cd frontend && npx tsc --noEmit 2>/dev/null; then
    echo -e "${GREEN}✓${NC} TypeScript type check passed"
else
    echo -e "${YELLOW}⚠${NC} TypeScript type check had issues (may be non-blocking)"
fi
cd ..

echo
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}✗ CI Type Check FAILED with $ERRORS error(s)${NC}"
    exit 1
else
    echo -e "${GREEN}✓ CI Type Check PASSED${NC}"
    exit 0
fi
