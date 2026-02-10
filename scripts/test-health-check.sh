#!/bin/bash

# Test Health Check Script for RPMA
# This script runs various checks to assess test health

set -e

echo "🔍 RPMA Test Health Check"
echo "========================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1"
        return 1
    fi
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

info() {
    echo -e "ℹ${NC} $1"
}

echo "1. Checking Backend Test Compilation..."
echo "-----------------------------------"
cd src-tauri

# Try to compile tests (with timeout)
if timeout 60 cargo test --no-run 2>/dev/null; then
    check_result "Backend tests compile successfully"
else
    check_result "Backend tests compile successfully" || true
    echo
    echo "Compilation errors found (first 10 lines):"
    timeout 10 cargo check --tests 2>&1 | grep -E "error:|warning:" | head -10 || true
    echo
fi

cd ..

echo
echo "2. Checking Frontend Test Status..."
echo "---------------------------------"
cd frontend

# Check if tests can run (with timeout)
if timeout 30 npm test --watchAll=false 2>/dev/null; then
    check_result "Frontend tests pass"
else
    warning "Frontend tests have issues or timed out"
    timeout 10 npm test --watchAll=false 2>&1 | grep -E "(FAIL|error:|Error:)" | head -10 || true
fi

cd ..

echo
echo "3. Checking Test Coverage..."
echo "--------------------------"

# Backend test coverage (if available)
if command -v cargo-llvm-cov &> /dev/null; then
    cd src-tauri
    if cargo llvm-cov --lib 2>/dev/null; then
        info "Backend test coverage available"
    else
        warning "Backend test coverage not configured"
    fi
    cd ..
else
    warning "cargo-llvm-cov not installed"
fi

# Frontend coverage
cd frontend
if [ -f "coverage/lcov-report/index.html" ]; then
    check_result "Frontend test coverage report exists"
elif npm run test:coverage 2>/dev/null; then
    check_result "Frontend test coverage generated"
else
    warning "Frontend test coverage not working"
fi
cd ..

echo
echo "4. Checking Test File Organization..."
echo "-------------------------------------"

# Check for test directory structure
if [ -d "src-tauri/src/tests" ]; then
    check_result "Backend test directory exists"
else
    warning "Backend test directory missing"
fi

if [ -d "frontend/src/__tests__" ]; then
    check_result "Frontend test directory exists"
else
    warning "Frontend test directory missing"
fi

if [ -d "frontend/tests/e2e" ]; then
    check_result "E2E test directory exists"
else
    warning "E2E test directory missing"
fi

# Check for test modules
if [ -f "src-tauri/src/tests/mod.rs" ]; then
    check_result "Backend test module file exists"
else
    warning "Backend test module file missing"
fi

echo
echo "5. Checking for Common Test Issues..."
echo "-------------------------------------"

# Check for TODO/FIXME in test files
TODO_COUNT=$(find . -name "*.rs" -path "*/tests/*" -exec grep -l "TODO\|FIXME" {} \; | wc -l)
if [ $TODO_COUNT -gt 0 ]; then
    warning "$TODO_COUNT test files contain TODO/FIXME comments"
else
    check_result "No TODO/FIXME found in test files"
fi

# Check for console.log in test files
CONSOLE_COUNT=$(find . -name "*.test.*" -exec grep -l "console\.log" {} \; | wc -l)
if [ $CONSOLE_COUNT -gt 0 ]; then
    warning "$CONSOLE_COUNT test files contain console.log statements"
else
    check_result "No console.log found in test files"
fi

# Check for hardcoded test data
HARDCODED_COUNT=$(grep -r "\"admin@test\.com\"" src-tauri/src/tests/ 2>/dev/null | wc -l || echo 0)
if [ $HARDCODED_COUNT -gt 2 ]; then
    warning "Multiple instances of hardcoded test email found"
else
    check_result "Test data usage looks reasonable"
fi

echo
echo "6. Test Statistics..."
echo "----------------------"

# Count test files
BACKEND_TEST_FILES=$(find src-tauri/src/tests -name "*.rs" | wc -l)
FRONTEND_TEST_FILES=$(find frontend/src -name "*.test.*" -o -name "*.spec.*" | wc -l)
E2E_TEST_FILES=$(find frontend/tests/e2e -name "*.spec.ts" | wc -l)

echo "Backend test files: $BACKEND_TEST_FILES"
echo "Frontend unit test files: $FRONTEND_TEST_FILES"
echo "E2E test files: $E2E_TEST_FILES"

# Count test functions
BACKEND_TESTS=$(grep -r "#\[test\]\|#\[tokio::test\]" src-tauri/src/tests/ | wc -l)
FRONTEND_TESTS=$(grep -r "it\|test\|describe" frontend/src/ --include="*.test.*" --include="*.spec.*" | wc -l)

echo "Backend test functions: $BACKEND_TESTS"
echo "Frontend test functions: $FRONTEND_TESTS"

echo
echo "7. Recommendations..."
echo "--------------------"

# Generate recommendations based on findings
if [ $BACKEND_TEST_FILES -lt 20 ]; then
    warning "Consider adding more backend test files"
fi

if [ $E2E_TEST_FILES -lt 5 ]; then
    warning "Consider adding more E2E test coverage"
fi

# Check for missing tests in critical areas
if [ ! -f "src-tauri/tests/commands/client_commands_test.rs" ]; then
    warning "Missing client management command tests"
fi

if [ ! -f "src-tauri/tests/commands/material_commands_test.rs" ]; then
    warning "Missing material management command tests"
fi

if [ ! -f "src-tauri/tests/commands/report_commands_test.rs" ]; then
    warning "Missing reporting command tests"
fi

echo
echo "✅ Test health check complete!"
echo
echo "For detailed test mapping, see: TEST_MAP.md"
echo "For test health report, see: TEST_HEALTH_REPORT.md"
echo "For testing guidelines, see: TESTING_GUIDELINES.md"