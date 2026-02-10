# Client Lifecycle E2E Tests

This directory contains comprehensive end-to-end tests for the client lifecycle management feature in the RPMA application.

## Test Coverage

The `client-lifecycle.spec.ts` test file covers:

1. **Client Creation**
   - Creating individual clients with all required fields
   - Creating business clients with company information
   - Validation errors for invalid or missing data

2. **Client Management**
   - Updating client information
   - Deleting clients with confirmation
   - Viewing client details and history

3. **Client Search and Filtering**
   - Searching clients by name
   - Filtering by client type (individual/business)
   - Sorting clients by various criteria

4. **Vehicle Management**
   - Adding vehicles to clients
   - Associating vehicles with client tasks

5. **Data Persistence**
   - Verifying data persistence across page refreshes
   - Testing navigation between client pages

## Running the Tests

### Prerequisites

1. Run the Playwright E2E tests (the dev server is started automatically with mock IPC):
   ```bash
   npm run test:e2e
   ```

### Running the Tests

To run all client lifecycle tests:
```bash
npm run test:e2e -- --project chromium --grep "Client Lifecycle"
```

To run with a headed browser (useful for debugging):
```bash
npx playwright test client-lifecycle.spec.ts --headed
```

To run in debug mode:
```bash
npx playwright test client-lifecycle.spec.ts --debug
```

## Test Data

The tests use the following test data structures:

### Individual Client
```typescript
const testClient = {
  name: 'Test Client E2E',
  email: 'testclient@example.com',
  phone: '555-123-4567',
  address_street: '123 Test Street',
  address_city: 'Test City',
  address_state: 'Test State',
  address_zip: '12345',
  address_country: 'Test Country',
  customer_type: 'individual',
  notes: 'This is a test client created by E2E tests'
};
```

### Business Client
```typescript
const testBusinessClient = {
  name: 'Test Business E2E',
  email: 'business@example.com',
  phone: '555-987-6543',
  address_street: '456 Business Ave',
  address_city: 'Business City',
  address_state: 'Business State',
  address_zip: '67890',
  address_country: 'Business Country',
  customer_type: 'business',
  company_name: 'Test Business Inc.',
  contact_person: 'John Contact',
  notes: 'This is a test business client created by E2E tests'
};
```

### Vehicle
```typescript
const testVehicle = {
  make: 'Tesla',
  model: 'Model 3',
  plate: 'TEST-123',
  vin: '5YJ3E1EA1JF000001'
};
```

## Troubleshooting

### Server Connection Issues

If you encounter "Server is not running" errors:

1. Make sure the dev server is running on port 3000
2. Ensure Playwright started the Next.js dev server via `npm run test:e2e`
3. Verify there are no port conflicts

### Authentication Issues

If tests fail during login:

1. Verify the test user exists in the mock fixtures (`frontend/src/lib/ipc/mock/fixtures.ts`)
2. Check if the email and password are correct
3. Ensure `NEXT_PUBLIC_IPC_MOCK=true` is set for the E2E run

### Element Not Found Errors

If tests fail with "element not found" errors:

1. Run tests with `--headed` flag to see what's happening in the browser
2. Check if the UI structure has changed
3. Verify selectors match the actual DOM elements

## Best Practices

1. Clean up test data after each test run
2. Use unique identifiers for test data to avoid conflicts
3. Follow the Page Object Model pattern for better test organization
4. Add proper waits and assertions for all interactions
5. Test both happy path and error scenarios
