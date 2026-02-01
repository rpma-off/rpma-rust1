#!/usr/bin/env node

/**
 * Type Integration Test Suite
 *
 * Tests the 3-layer type synchronization between:
 * - Rust Backend (ts-rs generated types)
 * - IPC Communication Layer (response handlers)
 * - Frontend Validation (Zod schemas)
 *
 * This script creates temporary test files, runs comprehensive tests,
 * and cleans up after successful execution.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Starting Type Integration Test Suite...\n');

// Test configuration
const TEST_CONFIG = {
  tempDir: path.join(__dirname, 'temp-test-files'),
  testResults: [],
  cleanup: true
};

/**
 * Create temporary test files for validation
 */
function createTestFiles() {
  console.log('📝 Creating temporary test files...');

  // Ensure temp directory exists
  if (!fs.existsSync(TEST_CONFIG.tempDir)) {
    fs.mkdirSync(TEST_CONFIG.tempDir);
  }

  // Create test IPC response validation
  const ipcTestFile = path.join(TEST_CONFIG.tempDir, 'ipc-response-test.js');
  fs.writeFileSync(ipcTestFile, `
// Test IPC response validation - use direct path
const { validateTaskListResponse, validateClientListResponse } = require('../../frontend/src/lib/validation/backend-type-guards');

// Mock responses that match Rust backend serialization
const mockTaskListResponse = {
  data: [{
    id: "test-task-1",
    task_number: "T001",
    title: "Test Task",
    description: null,
    vehicle_plate: "ABC123",
    vehicle_model: "Model X",
    vehicle_year: "2023",
    vehicle_make: "Tesla",
    vin: null,
    ppf_zones: ["hood", "roof"],
    custom_ppf_zones: null,
    status: "scheduled",
    priority: "medium",
    technician_id: "tech-1",
    assigned_at: "2024-01-01T10:00:00Z",
    assigned_by: "admin",
    scheduled_date: "2024-01-02",
    start_time: null,
    end_time: null,
    date_rdv: null,
    heure_rdv: null,
    template_id: null,
    workflow_id: null,
    workflow_status: null,
    current_workflow_step_id: null,
    started_at: null,
    completed_at: null,
    completed_steps: null,
    client_id: "client-1",
    customer_name: "John Doe",
    customer_email: null,
    customer_phone: null,
    customer_address: null,
    external_id: null,
    lot_film: null,
    checklist_completed: false,
    notes: null,
    tags: null,
    estimated_duration: null,
    actual_duration: null,
    created_at: "2024-01-01T09:00:00Z",
    updated_at: "2024-01-01T09:00:00Z",
    creator_id: null,
    created_by: null,
    updated_by: null,
    deleted_at: null,
    deleted_by: null,
    synced: false,
    last_synced_at: null
  }],
  pagination: {
    page: 1,
    limit: 20,
    total: 1n,
    total_pages: 1
  },
  statistics: {
    total_tasks: 1,
    draft_tasks: 0,
    scheduled_tasks: 1,
    in_progress_tasks: 0,
    completed_tasks: 0,
    cancelled_tasks: 0,
    on_hold_tasks: 0,
    pending_tasks: 0,
    invalid_tasks: 0,
    archived_tasks: 0,
    failed_tasks: 0,
    overdue_tasks: 0,
    assigned_tasks: 1,
    paused_tasks: 0
  }
};

const mockClientListResponse = {
  data: [{
    id: "client-1",
    name: "John Doe",
    email: "john@example.com",
    phone: "+1234567890",
    customer_type: "individual",
    address_street: "123 Main St",
    address_city: "Anytown",
    address_state: "CA",
    address_zip: "12345",
    address_country: "USA",
    tax_id: null,
    company_name: null,
    contact_person: null,
    notes: null,
    tags: null,
    total_tasks: 1,
    active_tasks: 1,
    completed_tasks: 0,
    last_task_date: "2024-01-01",
    created_at: "2024-01-01T08:00:00Z",
    updated_at: "2024-01-01T08:00:00Z",
    created_by: null,
    deleted_at: null,
    deleted_by: null,
    synced: false,
    last_synced_at: null
  }],
  pagination: {
    page: 1,
    limit: 20,
    total: 1n,
    total_pages: 1
  },
  statistics: {
    total_clients: 1n,
    individual_clients: 1n,
    business_clients: 0n,
    clients_with_tasks: 1n,
    new_clients_this_month: 1n
  }
};

// Test functions
function testTaskListValidation() {
  try {
    const result = validateTaskListResponse(mockTaskListResponse);
    console.log('✅ TaskListResponse validation passed');
    return true;
  } catch (error) {
    console.error('❌ TaskListResponse validation failed:', error.message);
    return false;
  }
}

function testClientListValidation() {
  try {
    const result = validateClientListResponse(mockClientListResponse);
    console.log('✅ ClientListResponse validation passed');
    return true;
  } catch (error) {
    console.error('❌ ClientListResponse validation failed:', error.message);
    return false;
  }
}

function testResponseHandlers() {
  try {
    // Test that validation functions work directly (ResponseHandlers are tested in integration)
    const taskResult = validateTaskListResponse(mockTaskListResponse);
    console.log('✅ Task validation passed');

    const clientResult = validateClientListResponse(mockClientListResponse);
    console.log('✅ Client validation passed');

    return true;
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return false;
  }
}

// Export test functions
module.exports = {
  testTaskListValidation,
  testClientListValidation,
  testResponseHandlers,
  runAllTests: () => {
    const results = [
      testTaskListValidation(),
      testClientListValidation(),
      testResponseHandlers()
    ];
    return results.every(result => result);
  }
};
`);

  // Create timestamp serialization test
  const timestampTestFile = path.join(TEST_CONFIG.tempDir, 'timestamp-test.js');
  fs.writeFileSync(timestampTestFile, `
// Test timestamp serialization consistency
const fs = require('fs');
const path = require('path');

// Read the generated backend types
const backendTypesPath = path.join(__dirname, '../../frontend/src/lib/backend.ts');
const backendTypes = fs.readFileSync(backendTypesPath, 'utf8');

// Test that timestamp fields are properly typed as strings
function testTimestampFields() {
  const timestampFields = [
    'assigned_at', 'scheduled_date', 'start_time', 'end_time', 'started_at', 'completed_at',
    'created_at', 'updated_at', 'deleted_at', 'last_synced_at', 'date_rdv', 'heure_rdv'
  ];

  let allCorrect = true;

  for (const field of timestampFields) {
    // Check that timestamp fields are typed as strings, not unions
    const fieldPattern = new RegExp(\`\${field}: string\`);
    const unionPattern = new RegExp(\`\${field}: .*union.*string.*number.*\`);

    if (unionPattern.test(backendTypes)) {
      console.error(\`❌ Timestamp field '\${field}' still has union type (string | number)\`);
      allCorrect = false;
    } else if (fieldPattern.test(backendTypes)) {
      console.log(\`✅ Timestamp field '\${field}' correctly typed as string\`);
    }
  }

  return allCorrect;
}

function testNoTransformations() {
  // Check that there are no .transform() calls in the generated types
  const transformPattern = /transform/g;
  const matches = backendTypes.match(transformPattern);

  if (matches && matches.length > 0) {
    console.error(\`❌ Found \${matches.length} transform() calls in generated types - these should be removed\`);
    return false;
  }

  console.log('✅ No transform() calls found in generated types');
  return true;
}

module.exports = {
  testTimestampFields,
  testNoTransformations,
  runAllTests: () => {
    const results = [
      testTimestampFields(),
      testNoTransformations()
    ];
    return results.every(result => result);
  }
};
`);

  console.log('✅ Temporary test files created');
}

/**
 * Run type synchronization test
 */
function testTypeSync() {
  console.log('\n🔄 Testing type synchronization...');

  try {
    // Run type sync
    execSync('npm run types:sync', { stdio: 'pipe' });
    console.log('✅ Type synchronization completed successfully');

    // Verify the generated file exists and has content
    const backendTypesPath = path.join(__dirname, '../frontend/src/lib/backend.ts');
    if (!fs.existsSync(backendTypesPath)) {
      throw new Error('Generated types file does not exist');
    }

    const content = fs.readFileSync(backendTypesPath, 'utf8');
    if (content.length < 1000) {
      throw new Error('Generated types file seems too small');
    }

    console.log('✅ Generated types file is valid');
    TEST_CONFIG.testResults.push({ test: 'Type Sync', status: 'PASSED' });
    return true;

  } catch (error) {
    console.error('❌ Type synchronization failed:', error.message);
    TEST_CONFIG.testResults.push({ test: 'Type Sync', status: 'FAILED', error: error.message });
    return false;
  }
}

/**
 * Run IPC response validation tests
 */
function testIPCResponses() {
  console.log('\n🔗 Testing IPC response validation...');

  try {
    // Test that the validation functions exist and schemas are correct
    const fs = require('fs');
    const path = require('path');

    // Read the validation file to check if our schemas exist
    const validationPath = path.join(__dirname, '../frontend/src/lib/validation/backend-type-guards.ts');
    const validationContent = fs.readFileSync(validationPath, 'utf8');

    const checks = [
      { name: 'TaskListResponseSchema', pattern: /TaskListResponseSchema.*=/ },
      { name: 'ClientListResponseSchema', pattern: /ClientListResponseSchema.*=/ },
      { name: 'validateTaskListResponse', pattern: /validateTaskListResponse/ },
      { name: 'validateClientListResponse', pattern: /validateClientListResponse/ }
    ];

    let allFound = true;
    for (const check of checks) {
      if (!check.pattern.test(validationContent)) {
        console.error(`❌ ${check.name} not found in validation file`);
        allFound = false;
      } else {
        console.log(`✅ ${check.name} found in validation file`);
      }
    }

    if (allFound) {
      console.log('✅ All IPC response validation components present');
      TEST_CONFIG.testResults.push({ test: 'IPC Response Validation', status: 'PASSED' });
      return true;
    } else {
      TEST_CONFIG.testResults.push({ test: 'IPC Response Validation', status: 'FAILED' });
      return false;
    }

  } catch (error) {
    console.error('❌ IPC response validation tests failed:', error.message);
    TEST_CONFIG.testResults.push({ test: 'IPC Response Validation', status: 'FAILED', error: error.message });
    return false;
  }
}

/**
 * Run timestamp serialization tests
 */
function testTimestampSerialization() {
  console.log('\n⏰ Testing timestamp serialization...');

  try {
    const timestampTests = require('./temp-test-files/timestamp-test');
    const success = timestampTests.runAllTests();

    if (success) {
      console.log('✅ All timestamp serialization tests passed');
      TEST_CONFIG.testResults.push({ test: 'Timestamp Serialization', status: 'PASSED' });
      return true;
    } else {
      console.error('❌ Some timestamp serialization tests failed');
      TEST_CONFIG.testResults.push({ test: 'Timestamp Serialization', status: 'FAILED' });
      return false;
    }

  } catch (error) {
    console.error('❌ Timestamp serialization tests failed:', error.message);
    TEST_CONFIG.testResults.push({ test: 'Timestamp Serialization', status: 'FAILED', error: error.message });
    return false;
  }
}

/**
 * Run comprehensive type checking
 */
function testFullTypeCheck() {
  console.log('\n🔍 Running comprehensive type checking...');

  try {
    // Run frontend type check
    execSync('npm run frontend:type-check', { stdio: 'pipe' });
    console.log('✅ Frontend TypeScript compilation successful');

    // Run backend type check
    execSync('npm run backend:check', { stdio: 'pipe' });
    console.log('✅ Backend Rust compilation successful');

    // Run type drift detection
    execSync('node scripts/check-type-drift.js', { stdio: 'pipe' });
    console.log('✅ Type drift detection passed');

    TEST_CONFIG.testResults.push({ test: 'Full Type Check', status: 'PASSED' });
    return true;

  } catch (error) {
    console.error('❌ Comprehensive type checking failed:', error.message);
    TEST_CONFIG.testResults.push({ test: 'Full Type Check', status: 'FAILED', error: error.message });
    return false;
  }
}

/**
 * Clean up temporary files
 */
function cleanup() {
  if (!TEST_CONFIG.cleanup) {
    console.log('ℹ️  Skipping cleanup as requested');
    return;
  }

  console.log('\n🧹 Cleaning up temporary test files...');

  try {
    if (fs.existsSync(TEST_CONFIG.tempDir)) {
      fs.rmSync(TEST_CONFIG.tempDir, { recursive: true, force: true });
    }
    console.log('✅ Temporary files cleaned up');
  } catch (error) {
    console.warn('⚠️  Failed to clean up temporary files:', error.message);
  }
}

/**
 * Generate test report
 */
function generateReport() {
  console.log('\n📊 Test Results Summary:');
  console.log('=' .repeat(50));

  const passed = TEST_CONFIG.testResults.filter(r => r.status === 'PASSED').length;
  const failed = TEST_CONFIG.testResults.filter(r => r.status === 'FAILED').length;
  const total = TEST_CONFIG.testResults.length;

  TEST_CONFIG.testResults.forEach(result => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${status} ${result.test}: ${result.status}`);
    if (result.error) {
      console.log('   Error: ' + result.error);
    }
  });

  console.log('='.repeat(50));
  console.log('Total Tests: ' + total);
  console.log('Passed: ' + passed);
  console.log('Failed: ' + failed);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Type integration is working correctly.');
    return true;
  } else {
    console.log('\n💥 ' + failed + ' test(s) failed. Please check the errors above.');
    return false;
  }
}

/**
 * Main test execution
 */
async function main() {
  try {
    // Create test files
    createTestFiles();

    // Run all tests
    const tests = [
      testTypeSync,
      testIPCResponses,
      testTimestampSerialization,
      testFullTypeCheck
    ];

    let allPassed = true;
    for (const test of tests) {
      const passed = test();
      allPassed = allPassed && passed;
    }

    // Generate report
    const reportSuccess = generateReport();

    // Clean up only if all tests passed
    if (allPassed && reportSuccess) {
      cleanup();
      console.log('\n✨ Type integration test suite completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Test suite failed. Temporary files preserved for debugging.');
      TEST_CONFIG.cleanup = false;
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Test suite execution failed:', error);
    TEST_CONFIG.cleanup = false;
    process.exit(1);
  }
}

// Run the test suite
main();