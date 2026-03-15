#!/usr/bin/env node
/**
 * validate-types.js
 *
 * Checks that no type definitions in frontend/src/domains/** manually duplicate
 * types that are already exported from frontend/src/types/*.  Reports any
 * remaining drift and exits with a non-zero code on failure.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FRONTEND = path.join(ROOT, 'frontend', 'src');
const TYPES_DIR = path.join(FRONTEND, 'types');
const DOMAINS_DIR = path.join(FRONTEND, 'domains');

// ---------------------------------------------------------------------------
// Known structural conflicts: same type name but intentionally different
// shapes (e.g. snake_case vs camelCase, different use-case, enum vs interface).
// These are NOT considered duplicates.
// ---------------------------------------------------------------------------
const KNOWN_STRUCTURAL_CONFLICTS = new Set([
  // TaskHistoryEntry in task-history.service.ts tracks generic audit events
  // (id, taskId, action, userId, timestamp) whereas the canonical one in
  // @/types/task.types tracks IPC-returned status changes.
  'TaskHistoryEntry|frontend/src/domains/tasks/services/task-history.service.ts',

  // VehicleInfo in QuoteConvertDialog is a quote-specific form type with
  // required fields (plate, make, model, year, vin, ppfZones) whereas the
  // canonical one in ppf-intervention.ts uses optional fields and number year.
  'VehicleInfo|frontend/src/domains/quotes/components/QuoteConvertDialog.tsx',

  // TaskPhoto in task-photo.service.ts uses snake_case (task_id, photo_type,
  // file_path, taken_at) whereas unified.ts TaskPhoto uses camelCase DTOs.
  'TaskPhoto|frontend/src/domains/documents/services/task-photo.service.ts',

  // PPFPhoto in photo.service.ts has interventionId/stepId/uploadedAt whereas
  // the ppf-intervention.ts PPFPhoto has url/angle/category/timestamp.
  'PPFPhoto|frontend/src/domains/interventions/services/photo.service.ts',

  // BusinessRule in configuration.service.ts uses condition/action/sort_order
  // whereas configuration.types.ts BusinessRule uses conditions[]/actions[].
  'BusinessRule|frontend/src/domains/settings/services/configuration.service.ts',

  // ClientFilters in useClients.ts is optimised for the hook's IPC query
  // (CustomerType, limit, sort_by) whereas client.types.ts ClientFilters
  // adds has_tasks, created_after/before, page_size.
  'ClientFilters|frontend/src/domains/clients/hooks/useClients.ts',

  // BusinessRuleFiltersData / ConfigurationFiltersData / ServiceResponse in
  // admin/server/index.ts have different optional fields than their counterparts
  // in configuration.types.ts / unified.types.ts.
  'BusinessRuleFiltersData|frontend/src/domains/admin/server/index.ts',
  'ConfigurationFiltersData|frontend/src/domains/admin/server/index.ts',
  'ServiceResponse|frontend/src/domains/admin/server/index.ts',

  // OperationStatus in useOfflineQueue.ts is an enum with PROCESSING/RETRYING
  // values whereas unified.types.ts OperationStatus is a string literal union.
  'OperationStatus|frontend/src/domains/sync/hooks/useOfflineQueue.ts',

  // PPFZone in TaskForm/types.ts is an interface {id, name, category?} used
  // for UI zone selection, whereas enums.ts PPFZone is an enum of zone keys.
  'PPFZone|frontend/src/domains/tasks/components/TaskForm/types.ts',

  // Technician in technician.service.ts has specialization/isActive/workload
  // whereas unified.ts Technician has role/skills/availability/performance.
  'Technician|frontend/src/domains/users/services/technician.service.ts',

  // SignupCredentials in auth.service.ts uses camelCase (firstName, lastName)
  // for the UI layer, whereas auth.types.ts uses snake_case (first_name, last_name).
  'SignupCredentials|frontend/src/domains/users/server/services/auth.service.ts',

  // QuotePageStats in quote-stats.ts is a minimal subset with only 4 fields
  // whereas quote.types.ts QuotePageStats has 8 fields; the domain's
  // computeQuoteStats function signature also differs.
  'QuotePageStats|frontend/src/domains/quotes/utils/quote-stats.ts',

  // ServiceResponse in configurationService.ts is a lightweight internal helper
  // { success, data?, error?, status? } whereas unified.types.ts ServiceResponse
  // has required status, message?, and metadata? fields.
  'ServiceResponse|frontend/src/domains/settings/api/configurationService.ts',

  // SystemStatus in configurationService.ts uses 'degraded'/'down' variants
  // whereas configuration.types.ts SystemStatus uses 'warning'/'error' variants.
  'SystemStatus|frontend/src/domains/settings/api/configurationService.ts',

  // ValidationResult in configurationService.ts has { valid: boolean, errors? }
  // whereas unified.types.ts ValidationResult has { isValid, errors, warnings?, fieldErrors? }.
  'ValidationResult|frontend/src/domains/settings/api/configurationService.ts',

  // BusinessRule in settings/api/types.ts is a flat record (condition: string,
  // action: string, priority: 'low'|'medium'|'high') whereas
  // configuration.types.ts BusinessRule has nested conditions[]/actions[] and
  // a numeric priority field.
  'BusinessRule|frontend/src/domains/settings/api/types.ts',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

/**
 * Walk a directory recursively, yielding .ts and .tsx files.
 * @param {string} dir
 * @returns {string[]}
 */
function walkTs(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkTs(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts') && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Extract all *locally defined* type/interface/enum names from a file.
 * "Locally defined" means lines that start with `export interface`, `export type =`,
 * or `export enum` — i.e. NOT re-export (`export type { … } from`).
 * @param {string} source
 * @returns {string[]}
 */
function extractLocalDefinitions(source) {
  const names = [];
  // Match: export interface Foo  |  export type Foo =  |  export enum Foo
  const defRe = /^export\s+(?:interface|enum)\s+(\w+)/gm;
  const typeDefRe = /^export\s+type\s+(\w+)\s*=/gm;
  let m;
  while ((m = defRe.exec(source)) !== null) names.push(m[1]);
  while ((m = typeDefRe.exec(source)) !== null) names.push(m[1]);
  return names;
}

/**
 * Extract all exported names from a file (including re-exports).
 * @param {string} source
 * @returns {string[]}
 */
function extractAllExports(source) {
  const names = new Set();
  // Local definitions
  extractLocalDefinitions(source).forEach(n => names.add(n));
  // Re-export named: export type { Foo, Bar } from '...'
  const reExportRe = /export\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"][^'"]+['"]/g;
  let m;
  while ((m = reExportRe.exec(source)) !== null) {
    const items = m[1].split(',').map(s => {
      const parts = s.trim().split(/\s+as\s+/);
      return (parts[1] || parts[0]).trim();
    });
    items.forEach(n => { if (n) names.add(n); });
  }
  return [...names];
}

// ---------------------------------------------------------------------------
// Build the set of names exported from frontend/src/types/
// ---------------------------------------------------------------------------

const centralTypeNames = new Set();
for (const file of walkTs(TYPES_DIR)) {
  const source = readFileSafe(file);
  extractAllExports(source).forEach(n => centralTypeNames.add(n));
}

// ---------------------------------------------------------------------------
// Scan domain files for local definitions that duplicate central types
// ---------------------------------------------------------------------------

const errors = [];
const warnings = [];

for (const file of walkTs(DOMAINS_DIR)) {
  const source = readFileSafe(file);
  const localDefs = extractLocalDefinitions(source);
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');

  for (const name of localDefs) {
    if (centralTypeNames.has(name)) {
      const conflictKey = `${name}|${rel}`;
      if (KNOWN_STRUCTURAL_CONFLICTS.has(conflictKey)) {
        // Intentional structural conflict — skip
        continue;
      }
      errors.push(`DUPLICATE: "${name}" is defined locally in ${rel} but already exported from frontend/src/types/`);
    }
  }
}

// ---------------------------------------------------------------------------
// Check that the auto-generated lib/backend types are not re-defined in domains
// ---------------------------------------------------------------------------

const BACKEND_DIR = path.join(FRONTEND, 'lib', 'backend');
const backendTypeNames = new Set();
for (const file of walkTs(BACKEND_DIR)) {
  const source = readFileSafe(file);
  extractAllExports(source).forEach(n => backendTypeNames.add(n));
}

for (const file of walkTs(DOMAINS_DIR)) {
  const source = readFileSafe(file);
  const localDefs = extractLocalDefinitions(source);
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');

  for (const name of localDefs) {
    if (backendTypeNames.has(name) && !centralTypeNames.has(name)) {
      warnings.push(`WARN: "${name}" is defined locally in ${rel} and also auto-generated in lib/backend (consider moving to frontend/src/types/)`);
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

let exitCode = 0;

if (errors.length > 0) {
  console.error('\n❌  Type duplication errors found:\n');
  for (const e of errors) {
    console.error('  ' + e);
  }
  exitCode = 1;
}

if (warnings.length > 0) {
  console.warn('\n⚠️   Type duplication warnings:\n');
  for (const w of warnings) {
    console.warn('  ' + w);
  }
}

if (exitCode === 0 && warnings.length === 0) {
  console.log('✅  No duplicate type definitions found between domains and frontend/src/types/.');
} else if (exitCode === 0) {
  console.log(`\n✅  No blocking duplicates. ${warnings.length} warning(s) above.`);
}

process.exit(exitCode);
