# Testing Guidelines for RPMA Project

## Overview

This document provides guidelines for writing and maintaining tests in the RPMA project to ensure code quality, prevent regressions, and maintain a healthy test suite.

## Principles

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how it does it
   - Avoid testing private implementation details
   - Use public APIs for testing

2. **Tests Should Fail Meaningfully**
   - If a test fails, it should be clear why
   - Include descriptive assertion messages
   - Each test should have a single clear purpose

3. **Tests Must Be Deterministic**
   - No reliance on timing or external randomness
   - Use seeded randomness when needed
   - Tests should produce the same result every time

4. **Tests Should Isolate Dependencies**
   - Mock external services and databases
   - Use test databases with known state
   - Clean up after each test

## Test Types

### Unit Tests
- Test individual functions and methods in isolation
- Fast to run and provide immediate feedback
- Located in `src-tauri/src/tests/unit/` for backend
- Use `#[test]` or `#[tokio::test]` attributes

### Integration Tests
- Test interaction between multiple components
- Verify that services work together correctly
- Located in `src-tauri/src/tests/integration/`
- Use shared test database setup

### Migration Tests
- Verify database schema changes work correctly
- Test both forward and potential rollback scenarios
- Located in `src-tauri/src/tests/migrations/`
- Must check:
  - Table creation with correct columns
  - Index creation
  - Foreign key constraints
  - Data migration if applicable

### Property-Based Tests
- Use random inputs to find edge cases
- Excellent for validation and transformation functions
- Located in `src-tauri/src/tests/proptests/`
- Use the `proptest` crate

### Frontend Component Tests
- Test React components in isolation
- Verify user interactions and state changes
- Use React Testing Library
- Located alongside components in `__tests__/` directories

### IPC Contract Tests
- Verify frontend-backend communication contracts
- Ensure API compatibility
- Located in `frontend/src/lib/ipc/__tests__/`
- Test both valid and invalid payloads

### E2E Tests
- Test complete user workflows
- Use Playwright
- Located in `frontend/tests/e2e/`
- Focus on critical business flows

## Writing Good Tests

### Test Structure
Each test should follow the AAA pattern:
1. **Arrange** - Set up test data and mocks
2. **Act** - Call the function/method under test
3. **Assert** - Verify the outcome

```rust
#[tokio::test]
async fn test_create_task_with_valid_data() {
    // Arrange
    let ctx = create_test_db().await;
    let session_token = create_test_session(&ctx).await;
    let task_req = CreateTaskRequest {
        title: "Test Task".to_string(),
        // ... other fields
    };
    
    // Act
    let result = create_task(task_req, session_token).await;
    
    // Assert
    assert!(result.is_ok());
    let task = result.unwrap();
    assert_eq!(task.title, "Test Task");
    assert!(!task.id.is_empty());
}
```

### Assertions Guidelines
- **Always validate results**, don't just check Ok(())
- Use specific assertions rather than generic ones
- Include meaningful error messages in assertions

```rust
// Bad - only checks success
assert!(result.is_ok());

// Good - validates the actual result
assert!(result.is_ok());
let user = result.unwrap();
assert_eq!(user.email, "test@example.com", "User email should match");

// Better - with error message
assert_eq!(user.email, "test@example.com", "Expected email 'test@example.com', got '{}'", user.email);
```

### Test Data Management
- Use factories/builder patterns for test data
- Keep test data minimal but realistic
- Use consistent naming for test entities

```rust
// Use a macro or helper function for common test data
macro_rules! test_client {
    (name: $name:expr) => {
        CreateClientRequest {
            name: $name.to_string(),
            address: "123 Test St".to_string(),
            phone: "555-0123".to_string(),
            email: format!("{}@test.com", $name.to_lowercase()),
        }
    };
}
```

### Error Testing
Always test error cases:
- Invalid inputs
- Constraint violations
- Network failures
- Permission denied

```rust
#[tokio::test]
async fn test_create_task_with_invalid_status() {
    let ctx = create_test_db().await;
    let session_token = create_test_session(&ctx).await;
    
    // Try to create task with invalid status
    let task_req = CreateTaskRequest {
        title: "Invalid Task".to_string(),
        status: TaskStatus::Completed, // Invalid for new task
        // ... other fields
    };
    
    let result = create_task(task_req, session_token).await;
    
    assert!(result.is_err());
    let error = result.unwrap_err();
    assert!(error.contains("Invalid status transition"));
}
```

## Common Anti-Patterns

### 1. Implementation Coupling
```rust
// Bad - testing internal implementation
assert_eq!(internal_counter, 5);

// Good - testing behavior
assert_eq!(results.len(), 5);
```

### 2. Magic Numbers
```rust
// Bad - unclear meaning
assert_eq!(result.status, 2);

// Good - use constants or enums
assert_eq!(result.status, TaskStatus::InProgress);
```

### 3. Testing Mocks
```rust
// Bad - verifying mock behavior
assert!(mock.verify_called());

// Good - verifying actual outcome
assert_eq!(user.email, "updated@example.com");
```

### 4. Overly Specific Assertions
```rust
// Bad - brittle exact match on GPS
assert_eq!(location.lat, 48.8566);

// Good - range or precision check
assert!((location.lat - 48.8566).abs() < 0.0001);
```

## Migration Test Checklist

For each migration test, ensure you verify:

### Schema Verification
- [ ] All tables are created
- [ ] All columns exist with correct types
- [ ] NOT NULL constraints are applied
- [ ] DEFAULT values are correct
- [ ] CHECK constraints are defined

### Index Verification
- [ ] Performance indexes are created
- [ ] Unique indexes are created
- [ ] Composite indexes are correctly ordered

### Foreign Key Verification
- [ ] Foreign keys reference correct tables
- [ ] ON DELETE/UPDATE actions are correct
- [ ] Circular references are avoided

### Trigger Verification
- [ ] Triggers exist for required operations
- [ ] Trigger logic is correct
- [ ] Audit/populate triggers work

### Data Migration
- [ ] Existing data is correctly transformed
- [ ] No data is lost
- [ ] Default values are applied correctly
- [ ] Referential integrity is maintained

## Frontend Testing Guidelines

### Component Testing
- Test user interactions, not implementation
- Mock API calls
- Test loading, error, and success states
- Use accessible queries (getByRole, getByLabelText)

### Hook Testing
- Test various states and transitions
- Test error handling
- Test cleanup on unmount
- Use act/await for async operations

### E2E Testing
- Focus on critical business flows
- Use page object pattern
- Wait for elements, don't use fixed delays
- Verify actual user outcomes, not just UI states

## Performance Testing

### When to Add Performance Tests
- Critical business operations
- Database queries with large datasets
- API endpoints with high traffic
- Complex computations

### Guidelines
- Use realistic data volumes
- Set clear performance baselines
- Test both warm and cold scenarios
- Monitor resource usage

## Test Maintenance

### Keeping Tests Healthy
1. Regular test runs (at least daily)
2. Review flaky tests immediately
3. Update tests when refactoring code
4. Remove obsolete tests
5. Document complex test scenarios

### When Tests Fail
1. Isolate the failing test
2. Check if it's a real bug or test issue
3. Fix the underlying problem
4. Verify fix doesn't break other tests
5. Document any special cases

## Continuous Integration

### Required Checks
- All tests must pass
- Minimum coverage thresholds
- No flaky tests allowed
- Migration tests on schema changes

### Test Commands
```bash
# Backend tests
cd src-tauri && cargo test --lib

# Frontend tests
cd frontend && npm test

# E2E tests
cd frontend && npm run test:e2e

# Migration tests
cd src-tauri && cargo test migration

# Property-based tests
cd src-tauri && cargo test proptest
```

## Code Review Checklist

When reviewing tests, check:
- [ ] Test has clear purpose and description
- [ ] Proper setup and teardown
- [ ] Meaningful assertions
- [ ] Edge cases are covered
- [ ] Error conditions are tested
- [ ] No implementation coupling
- [ ] Test is deterministic
- [ ] No hardcoded magic values
- [ ] Proper use of test utilities
- [ ] Documentation for complex scenarios

## Tools and Utilities

### Backend Testing
- `test_utils.rs` - Common test helpers
- `TestDatabase` - In-memory SQLite setup
- `create_test_*` functions - Test data factories
- Migration test framework

### Frontend Testing
- Mock IPC client for Tauri calls
- Test providers for React context
- Component render helpers
- E2E page objects

## Conclusion

Following these guidelines ensures our test suite remains healthy, maintainable, and valuable for catching regressions. Remember: tests are code too - they need to be clear, maintainable, and regularly reviewed.

When in doubt, prioritize:
1. Test behavior over implementation
2. Test error cases alongside success cases
3. Keep tests simple and focused
4. Update tests when updating code