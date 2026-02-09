# RPMA Test Suite - Complete Guide

## Table of Contents
1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing New Tests](#writing-new-tests)
5. [Test Types](#test-types)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Overview

The RPMA project has a comprehensive test suite covering:
- **Backend**: Rust services, repositories, and database migrations
- **Frontend**: React components, hooks, and IPC contracts
- **Integration**: Cross-service interactions
- **E2E**: Full user workflows
- **Performance**: Critical operation benchmarks

## Test Structure

### Backend Tests (`src-tauri/`)
```
src-tauri/src/tests/
├── unit/                    # Isolated unit tests
├── integration/             # Service integration tests
├── migrations/              # Database migration tests
├── proptests/              # Property-based tests
├── performance/            # Performance benchmarks
└── test_utils.rs           # Test utilities
```

### Frontend Tests (`frontend/`)
```
frontend/src/
├── components/**/__tests__/  # Component tests
├── hooks/__tests__/          # Hook tests
├── lib/ipc/__tests__/        # IPC contract tests
├── test-utils/              # Test helpers
└── tests/e2e/              # E2E tests
```

## Running Tests

### All Tests
```bash
# Backend all tests
cd src-tauri && cargo test --lib

# Frontend all tests
cd frontend && npm test

# E2E tests
cd frontend && npm run test:e2e
```

### Specific Test Types
```bash
# Migration tests only
cd src-tauri && cargo test migration

# Property-based tests
cd src-tauri && cargo test proptest

# Performance tests
cd src-tauri && cargo test performance

# Component tests only
cd frontend && npm test -- --testPathPattern=components
```

### With Coverage
```bash
# Backend coverage (requires llvm-cov)
cd src-tauri && cargo llvm-cov --html

# Frontend coverage
cd frontend && npm run test:coverage
```

## Writing New Tests

### Backend Service Test
```rust
#[tokio::test]
async fn test_service_behavior() {
    // Arrange
    let ctx = create_test_db().await;
    let service = YourService::new(ctx.db());
    let test_data = create_test_data();
    
    // Act
    let result = service.do_something(test_data).await;
    
    // Assert
    assert!(result.is_ok());
    let output = result.unwrap();
    assert_eq!(output.expected_field, "expected_value");
}
```

### Frontend Component Test
```tsx
import { renderWithProviders } from '../../test-utils';
import { YourComponent } from '../YourComponent';

test('component renders correctly', async () => {
    const { getByText } = renderWithProviders(
        <YourComponent prop="value" />,
        {
            mocks: {
                'get_data': () => Promise.resolve({
                    success: true,
                    data: mockData,
                }),
            },
        }
    );
    
    expect(getByText('Expected Text')).toBeInTheDocument();
});
```

### Migration Test
```rust
pub async fn test_your_migration(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check table exists
    let exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='your_table'"
    )
    .fetch_one(pool)
    .await?;
    assert!(exists, "your_table should exist");
    
    // Verify schema
    verify_schema(pool).await?;
    
    Ok(())
}
```

## Test Types

### Unit Tests
- Purpose: Test individual functions in isolation
- Location: `src-tauri/src/tests/unit/`
- Characteristics: Fast, focused, no external dependencies

### Integration Tests
- Purpose: Test interactions between components
- Location: `src-tauri/src/tests/integration/`
- Characteristics: Slower, test real interactions

### Migration Tests
- Purpose: Verify database schema changes
- Location: `src-tauri/src/tests/migrations/`
- Characteristics: Schema validation, data integrity

### Property-Based Tests
- Purpose: Find edge cases with random inputs
- Location: `src-tauri/src/tests/proptests/`
- Characteristics: Use `proptest` crate, comprehensive coverage

### Component Tests
- Purpose: Test React components
- Location: `frontend/src/components/**/__tests__/`
- Characteristics: Use React Testing Library

### Contract Tests
- Purpose: Verify API compatibility
- Location: `frontend/src/lib/ipc/__tests__/`
- Characteristics: Test request/response shapes

### E2E Tests
- Purpose: Test complete user workflows
- Location: `frontend/tests/e2e/`
- Characteristics: Use Playwright, slow but comprehensive

## Best Practices

### General
1. **One assertion per test** when possible
2. **Descriptive test names** that explain what is being tested
3. **Arrange-Act-Assert** pattern
4. **Independent tests** - no dependencies between tests
5. **Clean up** after each test

### Backend
1. Use `test_db!()` macro for test databases
2. Mock external services
3. Test error cases alongside success cases
4. Use `proptest` for validation functions

### Frontend
1. Use `renderWithProviders()` helper
2. Mock all IPC calls
3. Test loading, error, and success states
4. Use accessible queries (`getByRole`, `getByLabelText`)

### Performance Tests
1. Set clear thresholds
2. Warm up the database/system
3. Test with realistic data volumes
4. Measure averages and outliers

## Troubleshooting

### Common Issues

#### Tests Fail on Windows with `.to_string()` Error
**Issue**: Rust compiler on Windows incorrectly parses `.to_string()`  
**Solution**: Use `String::from()` or `to_string()` without the dot prefix  
**Status**: Known Windows/Rust compiler issue

#### Tests Timeout in CI
**Issue**: Tests take too long in CI environment  
**Solutions**:
- Increase timeout values
- Use mock data instead of real operations
- Parallelize independent tests

#### Flaky Tests
**Issue**: Tests pass/fail intermittently  
**Common Causes**:
- Timing dependencies
- Random data without seeding
- Shared state between tests
- External resource dependencies

**Solutions**:
- Add explicit waits
- Seed random generators
- Use isolated test databases
- Mock external resources

#### Coverage Low
**Issue**: Test coverage below threshold  
**Solutions**:
- Add tests for uncovered branches
- Check for dead code
- Review test assertions
- Add integration tests

### Debug Tips

1. **Use `dbg!()` macro** in Rust tests for quick debugging
2. **Log test data** before assertions
3. **Run single test** with `cargo test test_name`
4. **Use `--nocapture`** to see println! output
5. **Check test logs** in CI output

### Performance Issues

1. **Profile slow tests** with `cargo test --release`
2. **Use `--test-threads=1`** to detect shared state issues
3. **Check for memory leaks** in long-running tests
4. **Monitor database connections** in integration tests

## Test Metrics Dashboard

### Current Status (as of last audit)
- **Backend Coverage**: ~68%
- **Frontend Coverage**: ~72%
- **Migration Coverage**: 90%
- **Performance Tests**: Basic
- **E2E Coverage**: Critical paths only

### Targets
- **Backend Coverage**: >85%
- **Frontend Coverage**: >80%
- **Migration Coverage**: 100%
- **Performance Tests**: All critical operations
- **E2E Coverage**: All user workflows

## Continuous Integration

### Required Checks
- [ ] All tests pass
- [ ] Minimum coverage thresholds
- [ ] No flaky tests
- [ ] Migration tests pass

### Optional Checks
- [ ] Performance benchmarks
- [ ] Security audit
- [ ] Visual regression tests

## Resources

### Documentation
- [TESTING_GUIDELINES.md](./TESTING_GUIDELINES.md) - Detailed best practices
- [TEST_MAP.md](./TEST_MAP.md) - Complete test inventory
- [TEST_HEALTH_REPORT.md](./TEST_HEALTH_REPORT.md) - Health analysis

### Tools
- **Backend**: `cargo test`, `cargo llvm-cov`, `proptest`
- **Frontend**: Jest, React Testing Library, Playwright
- **CI**: GitHub Actions, GitLab CI
- **Coverage**: codecov, Codecov Dashboard

### Communities
- Rust Testing: [rust-users](https://users.rust-lang.org/)
- React Testing: [Reactiflux Discord](https://discord.gg/reactiflux)
- Playwright: [Playwright Discord](https://aka.ms/playwright/discord)

---

## Quick Reference

### Test Templates

#### Backend Unit Test
```rust
#[tokio::test]
async fn test_what_happens_when_condition() {
    let ctx = create_test_db().await;
    // ... test logic
}
```

#### Frontend Component Test
```tsx
import { renderWithProviders } from '../../test-utils';

test('description', async () => {
    renderWithProviders(<Component />);
    // ... test logic
});
```

#### Migration Test
```rust
pub async fn test_migration_xxx(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Verify table, columns, indexes
}
```

### Common Commands
```bash
# Run all tests
npm run test:all

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Performance tests
cargo test performance

# Migration tests
cargo test migration
```

---

Last updated: 2024-01-15
Maintainers: RPMA Dev Team