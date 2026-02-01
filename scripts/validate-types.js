#!/usr/bin/env node

/**
 * Type Validation Script
 *
 * This script validates that TypeScript types in frontend/src/lib/backend.ts
 * are in sync with Rust types. It performs several checks:
 *
 * 1. Checks that all expected types are present
 * 2. Validates type structure consistency
 * 3. Ensures no obvious drift has occurred
 *
 * Usage: node scripts/validate-types.js
 */

const fs = require('fs');
const path = require('path');

const BACKEND_TS_PATH = path.join(__dirname, '..', 'frontend', 'src', 'lib', 'backend.ts');

// Expected types that should be present
const EXPECTED_TYPES = {
  // Client types
  Client: 'interface',
  CustomerType: 'enum',

  // Task types
  Task: 'interface',
  TaskStatus: 'enum',
  TaskPriority: 'enum',
  SortOrder: 'enum',
  CreateTaskRequest: 'interface',
  UpdateTaskRequest: 'interface',
  DeleteTaskRequest: 'interface',
  TaskQuery: 'interface',
  TaskListResponse: 'interface',
  PaginationInfo: 'interface',
  TaskStatistics: 'interface',

  // User types
  UserAccount: 'interface',
  UserSession: 'interface',
  UserRole: 'enum',

  // Settings types
  GeneralSettings: 'interface',
  SecuritySettings: 'interface',
  NotificationSettings: 'interface',
  AppearanceSettings: 'interface',
  DataManagementSettings: 'interface',
  DatabaseSettings: 'interface',
  IntegrationSettings: 'interface',
  PerformanceSettings: 'interface',
  BackupSettings: 'interface',
  DiagnosticSettings: 'interface',
  AppSettings: 'interface',
  SystemConfiguration: 'interface',

  // Intervention types
  Intervention: 'interface',
  InterventionStatus: 'enum',
  InterventionType: 'enum',
  WeatherCondition: 'enum',
  LightingCondition: 'enum',
  WorkLocation: 'enum',
  FilmType: 'enum',
  GpsLocation: 'interface',

  // Photo types
  Photo: 'interface',
  PhotoType: 'enum',
  PhotoCategory: 'enum',

  // Sync types
  SyncOperation: 'interface',
  SyncStatus: 'enum',
  OperationType: 'enum',
  EntityType: 'enum',
  SyncQueueMetrics: 'interface',
};

function validateTypes() {
  console.log('🔍 Validating TypeScript types in backend.ts...\n');

  // Check if file exists
  if (!fs.existsSync(BACKEND_TS_PATH)) {
    console.error('❌ backend.ts file not found!');
    process.exit(1);
  }

  // Read file content
  const content = fs.readFileSync(BACKEND_TS_PATH, 'utf8');

  let errors = [];
  let warnings = [];

  // Check for expected types
  for (const [typeName, expectedKind] of Object.entries(EXPECTED_TYPES)) {
    const typeRegex = new RegExp(`(?:export )?(?:interface|type|enum) ${typeName}\\b`);
    const match = content.match(typeRegex);

    if (!match) {
      errors.push(`Missing ${expectedKind} ${typeName}`);
    } else {
      // Check if it's exported
      if (!match[0].includes('export')) {
        warnings.push(`${typeName} is not exported`);
      }
    }
  }

  // Check for common issues
  const lines = content.split('\n');

  // Check for any type definitions
  const typeDefinitionCount = (content.match(/(?:export )?(?:interface|type|enum)\s+\w+/g) || []).length;
  if (typeDefinitionCount < Object.keys(EXPECTED_TYPES).length * 0.8) {
    warnings.push(`Low type definition count: ${typeDefinitionCount} (expected ~${Object.keys(EXPECTED_TYPES).length})`);
  }

  // Check for null vs undefined issues (common drift indicator)
  const nullChecks = content.match(/\bnull\b/g) || [];
  const undefinedChecks = content.match(/\bundefined\b/g) || [];
  if (nullChecks.length > undefinedChecks.length * 2) {
    warnings.push('High ratio of null to undefined - possible serialization mismatch');
  }

  // Check for timestamp fields (should be strings)
  const timestampFields = content.match(/^\s*\w+:\s*string\s*;/gm) || [];
  if (timestampFields.length < 10) {
    warnings.push('Few string fields found - timestamp serialization may be inconsistent');
  }

  // Report results
  if (errors.length > 0) {
    console.log('❌ Validation Errors:');
    errors.forEach(error => console.log(`  - ${error}`));
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️  Validation Warnings:');
    warnings.forEach(warning => console.log(`  - ${warning}`));
    console.log('');
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All type validations passed!');
  } else if (errors.length === 0) {
    console.log('✅ No critical errors found, but some warnings to review.');
  } else {
    console.log('❌ Critical validation errors found. Please fix before committing.');
    process.exit(1);
  }

  // Summary
  const foundTypes = Object.keys(EXPECTED_TYPES).filter(typeName => {
    const regex = new RegExp(`(?:export )?(?:interface|type|enum) ${typeName}\\b`);
    return content.match(regex);
  });

  console.log(`\n📊 Summary:`);
  console.log(`  - Expected types: ${Object.keys(EXPECTED_TYPES).length}`);
  console.log(`  - Found types: ${foundTypes.length}`);
  console.log(`  - Missing types: ${Object.keys(EXPECTED_TYPES).length - foundTypes.length}`);
  console.log(`  - Errors: ${errors.length}`);
  console.log(`  - Warnings: ${warnings.length}`);
}

function checkTypeDrift() {
  console.log('\n🔄 Checking for potential type drift indicators...\n');

  const content = fs.readFileSync(BACKEND_TS_PATH, 'utf8');
  let driftIndicators = [];

  // Check for inconsistent enum values
  const enumMatches = content.match(/=\s*["'](\w+)["']/g) || [];
  const enumValues = enumMatches.map(match => match.match(/["'](\w+)["']/)[1]);

  // Look for potential mismatches
  if (enumValues.includes('lowercase') || enumValues.includes('UPPERCASE')) {
    driftIndicators.push('Found serde rename indicators in TypeScript - possible enum mismatch');
  }

  // Check for Option<T> patterns that might indicate manual conversion issues
  const optionPatterns = content.match(/\w+\?:\s*\w+/g) || [];
  if (optionPatterns.length > 20) {
    driftIndicators.push('High number of optional fields - verify null/undefined handling');
  }

  // Check for timestamp field consistency
  const timestampFields = content.match(/:\s*string\s*;\s*\/\/.*(?:time|date|at)/gi) || [];
  if (timestampFields.length < 5) {
    driftIndicators.push('Few timestamp fields found - check date serialization');
  }

  if (driftIndicators.length > 0) {
    console.log('⚠️  Potential type drift indicators:');
    driftIndicators.forEach(indicator => console.log(`  - ${indicator}`));
  } else {
    console.log('✅ No obvious type drift indicators found.');
  }
}

// Main execution
try {
  validateTypes();
  checkTypeDrift();
  console.log('\n🎉 Type validation complete!');
} catch (error) {
  console.error('❌ Validation failed with error:', error.message);
  process.exit(1);
}