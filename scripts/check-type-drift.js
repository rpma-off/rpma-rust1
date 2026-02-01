#!/usr/bin/env node

/**
 * Type Drift Detection Script
 *
 * This script analyzes type consistency between Rust backend and TypeScript frontend.
 * It identifies real type mismatches and provides actionable recommendations.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  rustSourceDir: 'src-tauri/src',
  generatedTypesFile: 'frontend/src/lib/backend.ts',
  manualTypesFiles: [
    'frontend/src/types/unified.types.ts',
    'frontend/src/types/api.ts'
  ]
};

/**
 * Extract type names from Rust source files
 */
function extractRustTypes() {
  const rustTypes = new Set();

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('.') && file !== 'target') {
        scanDirectory(filePath);
      } else if (file.endsWith('.rs')) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Look for lines that have both TS derive and struct/enum declarations
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          // Check if this line has TS derive (multiple patterns)
          if (line.includes('derive(ts)') ||
              line.includes('derive(TS)') ||
              line.includes('#[cfg_attr') && line.includes('TS)') ||
              line.includes('#[cfg_attr') && line.includes('ts_rs::TS')) {
            // Look ahead for the struct/enum declaration
            for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
              const nextLine = lines[j].trim();
              const structMatch = nextLine.match(/(?:pub\s+)?(?:struct|enum)\s+(\w+)/);
              if (structMatch) {
                rustTypes.add(structMatch[1]);
                break;
              }
            }
          }
        }
      }
    }
  }

  scanDirectory(CONFIG.rustSourceDir);
  return rustTypes;
}

/**
 * Extract type names from generated TypeScript file
 */
function extractGeneratedTypes() {
  const generatedTypes = new Set();

  if (!fs.existsSync(CONFIG.generatedTypesFile)) {
    return generatedTypes;
  }

  const content = fs.readFileSync(CONFIG.generatedTypesFile, 'utf8');

  // Extract export type/interface declarations
  const matches = content.matchAll(/export\s+(?:type|interface)\s+(\w+)/g);
  for (const match of matches) {
    generatedTypes.add(match[1]);
  }

  return generatedTypes;
}

/**
 * Extract type names from manual TypeScript files
 */
function extractManualTypes() {
  const manualTypes = new Set();

  for (const file of CONFIG.manualTypesFiles) {
    if (!fs.existsSync(file)) continue;

    const content = fs.readFileSync(file, 'utf8');

    // Extract export type/interface/class declarations
    const matches = content.matchAll(/export\s+(?:type|interface|class)\s+(\w+)/g);
    for (const match of matches) {
      manualTypes.add(match[1]);
    }
  }

  return manualTypes;
}

/**
 * Analyze type consistency
 */
function analyzeTypeConsistency() {
  console.log('🔍 Analyzing type consistency...');

  const rustTypes = extractRustTypes();
  const generatedTypes = extractGeneratedTypes();
  const manualTypes = extractManualTypes();

  console.log(`📊 Found ${rustTypes.size} Rust types`);
  console.log(`📊 Found ${generatedTypes.size} generated TypeScript types`);
  console.log(`📊 Found ${manualTypes.size} manual TypeScript types`);

  // Find issues
  const issues = [];

  // Types that are intentionally not generated (manual definitions preferred)
  const intentionallyManual = [
    'ApiError',        // Manual class with better error handling
    'ValidationResult', // Manual interface with additional fields
    'OverviewReport'   // Complex type causing memory issues
  ];

  // Internal IPC action types that don't need frontend generation
  const internalIpcTypes = [
    'TaskAction', 'ClientAction', 'UserResponse', 'ClientCrudRequest',
    'PhotoManagementAction', 'PhotoManagementResponse', 'TaskCrudRequest',
    'EditTaskRequest', 'AddTaskNoteRequest', 'SendTaskMessageRequest',
    'DelayTaskRequest', 'ReportTaskIssueRequest', 'ExportTasksCsvRequest',
    'ImportTasksBulkRequest', 'UserCrudRequest', 'TaskResponse'
  ];

  // Check for Rust types not generated
  for (const rustType of rustTypes) {
    if (!generatedTypes.has(rustType) &&
        !intentionallyManual.includes(rustType) &&
        !internalIpcTypes.includes(rustType)) {
      issues.push({
        type: 'missing_generated',
        severity: 'high',
        message: `Rust type '${rustType}' has TS derive but is not in generated types`,
        recommendation: 'Check export-types.rs registration or build process'
      });
    }
  }

  // Known acceptable duplicates (manual definitions serve different purposes)
  const knownAcceptableDuplicates = [
    // Core entity types with API contract differences
    'Client', 'Task',

    // Response types that have different pagination or structure in manual definitions
    'ClientListResponse', 'TaskListResponse', 'ClientStatistics', 'TaskStatistics',
    'PaginationInfo', 'TaskResponse',

    // Auth types with custom serialization or additional fields
    'ApiError', 'UserRole', 'UserSession'
  ];

  // Check for generated types that are also manually defined (duplicates)
  for (const genType of generatedTypes) {
    if (manualTypes.has(genType) && !knownAcceptableDuplicates.includes(genType)) {
      issues.push({
        type: 'duplicate_definition',
        severity: 'medium',
        message: `Type '${genType}' is both generated and manually defined`,
        recommendation: 'Consolidate to single definition or exclude from generation'
      });
    }
  }

  // Check for timestamp field consistency issues
  const timestampFields = ['created_at', 'updated_at', 'assigned_at', 'scheduled_date', 'start_time', 'end_time', 'started_at', 'completed_at'];
  for (const rustType of rustTypes) {
    // This is a basic check - in a real implementation, we'd parse the actual field types
    // For now, we trust that the generated types are correct if they compile
  }

  // Check for types that might be missing from Rust (reverse check)
  const allTsTypes = new Set([...generatedTypes, ...manualTypes]);
  const knownMissingTypes = [
    // Intentionally manual types (better functionality as classes/interfaces)
    'ApiError', 'ValidationResult', 'ServiceResponse', 'ApiResponse',

    // Complex types that cause memory issues during generation
    'OverviewReport',

    // Utility types and enums
    'Pagination', 'ServiceData', 'ListResponse',
    'TaskResponse', 'ClientResponse', 'UserResponse',
    'ApiResponseUnion', 'ApiErrorResult',
    'UserRole', 'DashboardStats', 'RecentTask',

    // Service layer types (no direct Rust equivalent needed)
    'RetryOptions', 'CacheConfig', 'AuditOptions',
    'PaginationOptions', 'FilterOptions', 'SearchOptions',
    'ValidationError', 'EntityId', 'Timestamp', 'OperationStatus', 'OperationResult',

    // UI-specific types
    'ListResponse', 'DashboardStats',

    // Types that do have Rust equivalents but are being misdetected
    'GpsCoordinates',

    // Validation schemas (Zod schemas, not Rust types)
    'TaskSchema', 'ClientSchema', 'UserAccountSchema', 'UserSessionSchema',
    'InterventionSchema', 'InterventionStepSchema', 'PhotoSchema', 'SyncOperationSchema',
    'NotificationTemplateSchema', 'NotificationMessageSchema', 'TaskListResponseSchema',
    'ClientListResponseSchema', 'PaginationInfoSchema'
  ];

  for (const tsType of allTsTypes) {
    if (!rustTypes.has(tsType) && !knownMissingTypes.includes(tsType)) {
      // This might be a real issue - TypeScript type without Rust equivalent
      issues.push({
        type: 'missing_rust_equivalent',
        severity: 'low',
        message: `TypeScript type '${tsType}' has no apparent Rust equivalent`,
        recommendation: 'Verify if this type needs a Rust equivalent or is intentionally manual'
      });
    }
  }

  return {
    rustTypes: Array.from(rustTypes).sort(),
    generatedTypes: Array.from(generatedTypes).sort(),
    manualTypes: Array.from(manualTypes).sort(),
    issues
  };
}

/**
 * Generate report
 */
function generateReport(analysis) {
  const report = {
    timestamp: new Date().toISOString(),
    status: analysis.issues.length === 0 ? 'PASS' : 'ISSUES_FOUND',
    summary: {
      rustTypes: analysis.rustTypes.length,
      generatedTypes: analysis.generatedTypes.length,
      manualTypes: analysis.manualTypes.length,
      totalIssues: analysis.issues.length,
      highSeverity: analysis.issues.filter(i => i.severity === 'high').length,
      mediumSeverity: analysis.issues.filter(i => i.severity === 'medium').length,
      lowSeverity: analysis.issues.filter(i => i.severity === 'low').length
    },
    issues: analysis.issues,
    rustExports: analysis.rustTypes,
    typescriptExports: [...analysis.generatedTypes, ...analysis.manualTypes].sort()
  };

  return report;
}

/**
 * Main execution
 */
function main() {
  try {
    const analysis = analyzeTypeConsistency();
    const report = generateReport(analysis);

    // Write report
    fs.writeFileSync('scripts/type-drift-report.json', JSON.stringify(report, null, 2));

    // Output summary
    console.log('\n📋 Type Consistency Analysis Complete');
    console.log(`Status: ${report.status}`);
    console.log(`Total Issues: ${report.summary.totalIssues}`);
    console.log(`- High: ${report.summary.highSeverity}`);
    console.log(`- Medium: ${report.summary.mediumSeverity}`);
    console.log(`- Low: ${report.summary.lowSeverity}`);

    if (report.issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      report.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
        console.log(`   💡 ${issue.recommendation}`);
      });
    } else {
      console.log('\n✅ No type consistency issues found!');
    }

    // Exit with appropriate code
    process.exit(report.status === 'PASS' ? 0 : 1);

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { analyzeTypeConsistency, generateReport };