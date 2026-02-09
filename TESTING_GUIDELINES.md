# RPMA v2 Testing Guidelines

This document provides guidelines for maintaining test health and preventing test-code misalignment in the RPMA project.

## Test Maintenance Philosophy

1. **Tests verify behavior, not implementation**
2. **Tests should be deterministic and reliable**
3. **Tests must evolve with the codebase**
4. **Test failures should be actionable**

## Test Structure Guidelines

### 1. Test File Organization

```
src-tauri/src/tests/
├── unit/           # Unit tests for individual services
├── integration/    # Integration tests for repositories
├── proptests/      # Property-based tests for edge cases
└── migrations/     # Database migration tests
```

### 2. Test Module Structure

Each test file should follow this structure:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    // Test setup helpers
    fn create_test_service() -> Service { ... }
    
    // Actual tests
    #[test]
    fn test_behavior() { ... }
}
```

### 3. Naming Conventions

- **Unit tests**: `*_service_tests.rs`, `*_repository_test.rs`
- **Integration tests**: `*_integration_test.rs`
- **Property tests**: `*_proptests.rs`
- **Test functions**: `test_<functionality>_<scenario>`

## Test Content Guidelines

### 1. Focus on Behavior, Not Implementation

❌ **Bad** (testing implementation):
```rust
assert_eq!(user.internal_id, 123);
assert_eq!(result.internal_state, "processing");
```

✅ **Good** (testing behavior):
```rust
assert!(response.is_success());
assert!(user.is_active());
assert!(can_perform_action(&user, &resource));
```

### 2. Test the Contract, Not Internal Details

❌ **Bad** (testing internal fields):
```rust
assert_eq!(task._internal_status, "queued");
```

✅ **Good** (testing observable behavior):
```rust
assert!(task.can_be_assigned());
assert_eq!(task.status(), TaskStatus::Queued);
```

### 3. Include Error Cases

Every critical function should have:
- Happy path test
- Invalid input test
- Authorization test (if applicable)
- Resource not found test

```rust
#[test]
fn test_create_task_success() {
    // Happy path
}

#[test]
fn test_create_task_invalid_input() {
    // Validation error
}

#[test]
fn test_create_task_unauthorized() {
    // Permission error
}

#[test]
fn test_create_task_missing_client() {
    // Not found error
}
```

## Test Data Guidelines

### 1. Use Factories, Not Hardcoded Data

❌ **Bad**:
```rust
let user = User {
    id: "user-123",
    email: "test@example.com",
    // ...
};
```

✅ **Good**:
```rust
let user = TestDataFactory::create_test_user();
let user = TestDataFactory::create_user_with_role(UserRole::Technician);
```

### 2. Make Test Data Meaningful

```rust
// Use descriptive values
let task = TestDataFactory::create_scheduled_task();
let task = TestDataFactory::create_overdue_task();
let task = TestDataFactory::create_high_priority_task();
```

### 3. Avoid Magic Numbers

```rust
// Instead of: assert_eq!(result.tasks.len(), 5);
const EXPECTED_TASKS: usize = 5;
assert_eq!(result.tasks.len(), EXPECTED_TASKS);
```

## IPC Command Testing Guidelines

### 1. Test All Command Variants

Each IPC command should test:
- Successful execution with valid data
- Validation errors with invalid data
- Authentication/authorization failures
- Error response format

```rust
#[tokio::test]
async fn test_command_success() {
    let session = create_test_session().await;
    let request = valid_request();
    
    let result = command_handler(request, session).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
    assert!(response.data.is_some());
}

#[tokio::test]
async fn test_command_validation_error() {
    let session = create_test_session().await;
    let request = invalid_request();
    
    let result = command_handler(request, session).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(!response.success);
    assert!(response.error.is_some());
    assert_eq!(response.error.unwrap().code, "VALIDATION_ERROR");
}
```

### 2. Verify Request/Response Shapes

Tests should verify the IPC contract:

```rust
// Verify request shape
expect(ipcClient.command).toHaveBeenCalledWith('command_name', {
    sessionToken: expect.any(String),
    requiredField: expect.any(String),
});

// Verify response structure
let response = await command();
expect(response).toHaveProperty('success');
expect(response).toHaveProperty('data');
if (response.success) {
    expect(response.data).toMatchSchema(expectedSchema);
}
```

## Database Testing Guidelines

### 1. Use Test Databases

Never use production data in tests:

```rust
fn create_test_db() -> TestDatabase {
    let temp_dir = tempdir().unwrap();
    let db_path = temp_dir.path().join("test.db");
    Database::new(&db_path).unwrap()
}
```

### 2. Test Migrations Comprehensively

Each migration should test:
- Forward migration application
- Data integrity after migration
- Rollback (if supported)
- Performance impact

```rust
#[test]
fn test_migration_XXX_applies_correctly() {
    let db = create_empty_test_db();
    
    // Apply migration
    migrate_to_version(&db, XXX);
    
    // Verify schema changes
    assert!(table_exists(&db, "new_table"));
    assert!(column_exists(&db, "table", "new_column"));
}
```

### 3. Isolate Test Data

Each test should start with clean data:

```rust
#[test]
fn test_repository_operation() {
    let db = create_test_db();
    let repo = Repository::new(db);
    
    // Test with known state
    let initial_count = repo.count().unwrap();
    
    // Perform operation
    repo.create(test_data()).unwrap();
    
    // Verify result
    assert_eq!(repo.count().unwrap(), initial_count + 1);
}
```

## Frontend Testing Guidelines

### 1. Test Component Behavior, Not Implementation

❌ **Bad**:
```tsx
expect(wrapper.find('.internal-class')).toHaveLength(1);
```

✅ **Good**:
```tsx
expect(wrapper.getByTestId('task-item')).toBeInTheDocument();
expect(wrapper.getByText('Task Title')).toBeInTheDocument();
```

### 2. Test User Interactions

```tsx
fireEvent.click(getByRole('button', { name: 'Save' }));
fireEvent.change(getByLabelText('Task Title'), { target: { value: 'New Task' } });
```

### 3. Mock External Dependencies

```tsx
jest.mock('../../lib/ipc/client', () => ({
    ipcClient: {
        invoke: jest.fn().mockResolvedValue(mockResponse),
    },
}));
```

## Test Maintenance Checklist

### When Changing Code:
- [ ] Update or create tests for new functionality
- [ ] Update test data factories if models change
- [ ] Run affected tests locally
- [ ] Update test documentation if behavior changes

### When Changing Tests:
- [ ] Verify test still checks important behavior
- [ ] Ensure test is deterministic
- [ ] Add comments for complex test scenarios
- [ ] Update fixtures if needed

### Regular Reviews (Monthly):
- [ ] Check for flaky or slow tests
- [ ] Review test coverage metrics
- [ ] Identify obsolete tests
- [ ] Update testing guidelines based on learnings

## Anti-Patterns to Avoid

### 1. Testing Implementation Details
```rust
// Don't test private methods
assert_eq!(service._internal_calculation(input), expected);

// Don't test database queries directly
assert_eq!(query, "SELECT * FROM users");
```

### 2. Non-Deterministic Tests
```rust
// Don't rely on timing
sleep(Duration::from_millis(100));

// Don't use random data without seeding
let random_id = rand::random::<u64>();
```

### 3. Overly Specific Assertions
```rust
// Too brittle
assert_eq!(error_message, "User 'john@example.com' not found in database");

// Better
assert!(error_message.contains("User"));
assert!(error_message.contains("not found"));
```

### 4. Missing Error Testing
```rust
// Don't only test success cases
#[test]
fn test_create_task() { /* only success case */ }

// Always test error cases
#[test]
fn test_create_task_success() { /* success case */ }
#[test]
fn test_create_task_invalid_data() { /* error case */ }
```

## When to Update Tests

### Mandatory Updates:
1. **Model/Struct Changes**: Update all tests using the changed model
2. **IPC Contract Changes**: Update command/response tests
3. **Business Rule Changes**: Update validation logic tests
4. **Schema Changes**: Update migration and repository tests

### Recommended Updates:
1. **Performance Changes**: Add/update performance tests
2. **Security Changes**: Add/update security tests
3. **UI Changes**: Update component tests
4. **New Features**: Add comprehensive test coverage

## Test Quality Checklist

Before committing tests, verify:

- [ ] Test compiles and runs without errors
- [ ] Test is deterministic (same result every run)
- [ ] Test has clear, descriptive name
- [ ] Test focuses on one behavior
- [ ] Test includes meaningful assertions
- [ ] Test handles cleanup properly
- [ ] Test has useful comments for complex logic
- [ ] Test data is representative of real data

## Tooling and Automation

### 1. Pre-commit Hooks
```bash
# Run tests before commit
npm run test
cargo test

# Check test coverage
npm run test:coverage
```

### 2. CI/CD Integration
- Run all tests on every PR
- Fail build on test failures
- Track test coverage over time
- Alert on performance regressions

### 3. Test Reporting
- Generate test health reports weekly
- Track test execution times
- Monitor flaky test detection
- Review coverage trends

## Resources

### Internal Documentation
- [TEST_MAP.md](./TEST_MAP.md) - Test inventory and mapping
- [TEST_HEALTH_REPORT.md](./TEST_HEALTH_REPORT.md) - Current test health status

### External Resources
- Rust Testing Book
- Jest Testing Framework
- Playwright Testing Guide
- Test-Driven Development Resources

---

**Document Version**: 1.0  
**Last Updated**: 2025-02-09  
**Review Schedule**: Monthly or as needed