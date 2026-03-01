#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(repoRoot, 'src-tauri', 'src');
const domainsRoot = path.join(srcRoot, 'domains');
const sharedRoot = path.join(srcRoot, 'shared');
const commandMaterialPath = path.join(srcRoot, 'commands', 'material.rs');
const serviceBuilderPath = path.join(srcRoot, 'service_builder.rs');
const enforcedTouchpoints = [commandMaterialPath, serviceBuilderPath];
const strictMode =
  process.env.BOUNDED_CONTEXT_STRICT === '1' ||
  process.env.BOUNDED_CONTEXT_STRICT === 'true' ||
  process.argv.includes('--strict');

// Progressive allowlist for known cross-domain violations being tracked for refactoring.
// Each entry is the violation message suffix after "Cross-domain access: ".
// New violations not in this list will still cause failure, preventing regressions.
const allowlistPath = path.join(__dirname, 'architecture-allowlist.json');
let crossDomainAllowlist = new Set();
try {
  const allowlistData = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  crossDomainAllowlist = new Set(allowlistData.allowed || []);
} catch {
  // No allowlist file — all violations are enforced
}

const placeholderMarkers = [
  'Placeholder module for bounded-context migration.',
  'migration target',
  'domain placeholder',
  'will be migrated into this domain',
];
const strictScaffoldMarkers = ['Domain layer module index.'];

const legacyServiceRealAllowlist = new Set([
  'services/mod.rs',
  'services/cache.rs',
  'services/domain_event.rs',
  'services/event_bus.rs',
  'services/event_system.rs',
  'services/performance_monitor.rs',
  'services/repository.rs',
  'services/system.rs',
  'services/validation.rs',
  'services/websocket_event_handler.rs',
  'services/worker_pool.rs',
]);

const legacyRepositoryRealAllowlist = new Set([
  'repositories/mod.rs',
  'repositories/base.rs',
  'repositories/cache.rs',
  'repositories/factory.rs',
]);

const sqlPattern = /(\bSELECT\b|\bINSERT\b|\bUPDATE\s+\w+\s+SET\b|\bDELETE\s+FROM\b|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|rusqlite::params!)/;

function listFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function isInfrastructureFile(filePath) {
  return filePath.includes(`${path.sep}infrastructure${path.sep}`);
}

function isIpcFile(filePath) {
  return filePath.includes(`${path.sep}ipc${path.sep}`);
}

function isTestFile(filePath) {
  return filePath.includes(`${path.sep}tests${path.sep}`);
}

function stripRustComments(contents) {
  return contents
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function isSharedDbFile(filePath) {
  return filePath.includes(`${path.sep}shared${path.sep}db${path.sep}`);
}

function checkSqlUsage() {
  const files = listFiles(domainsRoot)
    .filter((file) => file.endsWith('.rs'))
    .filter((file) => !isInfrastructureFile(file))
    .filter((file) => !isIpcFile(file))
    .filter((file) => !isTestFile(file));

  const violations = [];
  for (const file of files) {
    const contents = fs.readFileSync(file, 'utf8');
    if (sqlPattern.test(contents)) {
      violations.push(file);
    }
  }

  const sharedFiles = listFiles(sharedRoot)
    .filter((file) => file.endsWith('.rs'))
    .filter((file) => !isSharedDbFile(file));

  for (const file of sharedFiles) {
    const contents = fs.readFileSync(file, 'utf8');
    if (sqlPattern.test(contents)) {
      violations.push(file);
    }
  }

  for (const file of enforcedTouchpoints) {
    if (!fs.existsSync(file)) continue;
    const contents = stripRustComments(fs.readFileSync(file, 'utf8'));
    if (sqlPattern.test(contents)) {
      violations.push(file);
    }
  }

  return violations;
}

function checkBoundedContextImports() {
  const files = listFiles(domainsRoot)
    .filter((file) => file.endsWith('.rs'));

  const violations = [];
  for (const file of files) {
    const relative = path.relative(domainsRoot, file).replace(/\\/g, '/');
    const domainName = relative.split('/')[0];
    const rawContents = fs.readFileSync(file, 'utf8');
    const contents = stripRustComments(rawContents);
    const isInfra = isInfrastructureFile(file);
    const isTest = isTestFile(file);
    const isIpc = isIpcFile(file);

    const internalMatches = [...contents.matchAll(/crate::domains::([a-zA-Z0-9_]+)::(application|infrastructure|domain|ipc)/g)];
    if (isTest) {
      continue;
    }
    for (const match of internalMatches) {
      const referencedDomain = match[1];
      const referencedLayer = match[2];
      if (referencedDomain !== domainName) {
        violations.push(
          `${relative} imports ${referencedDomain}::${referencedLayer}; cross-domain communication must go through event bus/shared contracts`
        );
      }
    }

    // Only infrastructure (gateway), IPC (boundary adapter), and test files may import crate::services::
    // All other domain layers must not depend on legacy services directly
    const isApplicationInput = file.endsWith(`${path.sep}application${path.sep}input.rs`);
    if (!isInfra && !isTest && !isIpc && !isApplicationInput && /crate::services::/.test(contents)) {
      violations.push(`${relative} imports legacy services (move to infrastructure gateway or shared)`);
    }

    // Intra-domain IPC→infrastructure is allowed (IPC is a boundary adapter within the same domain)
    // Cross-domain infrastructure imports from IPC are already caught by the general cross-domain check above
    if (isIpc && /crate::domains::[a-zA-Z0-9_]+::application::[a-zA-Z0-9_]*(validate|rule|policy)/.test(contents)) {
      violations.push(`${relative} appears to run business validation from IPC layer`);
    }
    if (isIpc && /fn\s+map_[a-zA-Z0-9_]*error/.test(contents)) {
      violations.push(`${relative} defines error mapping logic in IPC layer (move to application/facade)`);
    }
  }

  return violations;
}

function checkDomainPublicApi() {
  const entries = fs.readdirSync(domainsRoot, { withFileTypes: true });
  const violations = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const modPath = path.join(domainsRoot, entry.name, 'mod.rs');
    if (!fs.existsSync(modPath)) {
      continue;
    }
    const relPath = `${entry.name}/mod.rs`;
    const contents = fs.readFileSync(modPath, 'utf8');
    const publicMods = (contents.match(/^\s*pub\s+mod\s+\w+/gm) || [])
      .filter((m) => !m.match(/pub\s+mod\s+domain\b/));
    if (publicMods.length > 0) {
      violations.push(`${relPath} should not expose pub mod declarations (except domain)`);
    }

    const facadeUses = contents.match(/^\s*pub\(crate\)\s+use\s+[^;]+;/gm) || [];
    if (facadeUses.length !== 1) {
      violations.push(`${relPath} should expose a single public facade`);
    }
    if (facadeUses.some((line) => line.includes('crate::repositories'))) {
      violations.push(`${relPath} should not re-export repositories`);
    }
    if (facadeUses.some((line) => line.includes('crate::models'))) {
      violations.push(`${relPath} should not re-export models`);
    }
  }

  return violations;
}

function checkDomainDirectoryStructure() {
  const entries = fs.readdirSync(domainsRoot, { withFileTypes: true });
  const violations = [];
  const requiredSubdirs = ['application', 'domain', 'infrastructure', 'ipc', 'tests'];

  // Ensure no loose .rs files exist (except mod.rs) — domains must be directories
  for (const entry of entries) {
    if (entry.isFile() && entry.name !== 'mod.rs') {
      violations.push(
        `${path.join(domainsRoot, entry.name)} is a loose file; each domain must be a directory with DDD layers`
      );
    }
  }

  // Ensure each domain directory has required DDD subdirectories and a facade
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const domainDir = path.join(domainsRoot, entry.name);

    for (const sub of requiredSubdirs) {
      const subDir = path.join(domainDir, sub);
      if (!fs.existsSync(subDir) || !fs.statSync(subDir).isDirectory()) {
        violations.push(`${entry.name}/ missing required subdirectory: ${sub}/`);
      }
    }

    const facadePath = path.join(domainDir, 'facade.rs');
    if (!fs.existsSync(facadePath)) {
      violations.push(`${entry.name}/ missing facade.rs`);
    }
  }

  return violations;
}

function checkCommandBusinessLogic() {
  const violations = [];
  if (fs.existsSync(commandMaterialPath)) {
    const contents = stripRustComments(fs.readFileSync(commandMaterialPath, 'utf8'));
    if (/and_then\(\|[a-zA-Z0-9_]+\|\s+match\s+[a-zA-Z0-9_]+\.as_str\(\)/.test(contents)) {
      violations.push(`${commandMaterialPath} contains request parsing logic (move to application/facade)`);
    }
  }
  return violations;
}

function checkPlaceholderMarkers() {
  const files = listFiles(domainsRoot).filter((file) => file.endsWith('.rs'));
  const violations = [];

  for (const file of files) {
    const contents = fs.readFileSync(file, 'utf8');
    if (placeholderMarkers.some((marker) => contents.includes(marker))) {
      violations.push(file);
    }
  }

  return violations;
}

function isDomainShim(contents) {
  const compact = contents.trim();
  return /^((\/\/!.*\n)*)\s*pub use crate::domains::[a-zA-Z0-9_]+::[a-zA-Z0-9_]+(?:::[a-zA-Z0-9_]+)*::\*;\s*$/m.test(compact);
}

function checkLegacyShimEnforcement() {
  const violations = [];

  const servicesDir = path.join(srcRoot, 'services');
  if (fs.existsSync(servicesDir)) {
    const legacyServiceFiles = listFiles(servicesDir)
      .filter((file) => file.endsWith('.rs'));
    for (const file of legacyServiceFiles) {
      const relative = path.relative(srcRoot, file).replace(/\\/g, '/');
      if (legacyServiceRealAllowlist.has(relative)) continue;
      const contents = fs.readFileSync(file, 'utf8');
      if (!isDomainShim(contents)) {
        violations.push(`services/${relative.replace(/^services\//, '')}`);
      }
    }
  }

  const repositoriesDir = path.join(srcRoot, 'repositories');
  if (fs.existsSync(repositoriesDir)) {
    const legacyRepositoryFiles = listFiles(repositoriesDir)
      .filter((file) => file.endsWith('.rs'));
    for (const file of legacyRepositoryFiles) {
      const relative = path.relative(srcRoot, file).replace(/\\/g, '/');
      if (legacyRepositoryRealAllowlist.has(relative)) continue;
      const contents = fs.readFileSync(file, 'utf8');
      if (!isDomainShim(contents)) {
        violations.push(`repositories/${relative.replace(/^repositories\//, '')}`);
      }
    }
  }

  return violations;
}

/**
 * Rule 6: Domain code must live under src-tauri/src/domains/.
 *
 * Scans legacy directories (commands/, models/, repositories/, services/)
 * for domain-specific files. Any domain-specific file outside domains/
 * is a violation.
 */
function checkDomainCodeLocation() {
  const domainNames = fs.readdirSync(domainsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  // Directories that are named after a domain are entirely domain-specific
  const domainDirNames = new Set(domainNames);

  // Singular-to-domain mapping for file-name heuristic matching
  const filePrefixToDomain = {
    auth: 'auth',
    auth_middleware: 'auth',
    consent: 'auth',
    session: 'auth',
    token: 'auth',
    two_factor: 'auth',
    user: 'users',
    task: 'tasks',
    intervention: 'interventions',
    workflow: 'interventions',
    step: 'interventions',
    client: 'clients',
    material: 'inventory',
    quote: 'quotes',
    calendar: 'calendar',
    report: 'reports',
    pdf_report: 'reports',
    pdf_generation: 'reports',
    dashboard: 'reports',
    notification: 'settings',
    settings: 'settings',
    audit: 'audit',
    security_monitor: 'audit',
    message: 'documents',
    photo: 'documents',
    document: 'documents',
    sync: 'sync',
  };

  const legacyDirs = ['commands', 'models', 'repositories', 'services'];
  const detected = [];

  for (const dir of legacyDirs) {
    const dirPath = path.join(srcRoot, dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = listFiles(dirPath).filter((f) => f.endsWith('.rs'));
    for (const file of files) {
      const relativePath = path.relative(srcRoot, file).replace(/\\/g, '/');

      // Check if the file is inside a subdirectory named after a domain
      const parts = relativePath.split('/');
      const subDir = parts.length > 2 ? parts[1] : null;
      if (subDir && domainDirNames.has(subDir)) {
        detected.push(relativePath);
        continue;
      }

      const baseName = path.basename(file, '.rs');

      // Skip infrastructure / cross-cutting files
      if (['mod', 'base', 'cache', 'factory', 'errors', 'error_utils', 'common',
           'status', 'status_tests', 'material_ts', 'compression',
           'correlation_helpers', 'ipc_optimization', 'analytics', 'performance',
           'queue', 'log', 'security', 'streaming', 'websocket',
           'websocket_commands', 'system', 'ui', 'navigation', 'alerting',
           'domain_event', 'event_bus', 'event_system', 'websocket_event_handler',
           'performance_monitor', 'rate_limiter', 'validation', 'repository',
           'worker_pool', 'operational_intelligence', 'prediction',
           'core', 'core_service', 'export_service', 'generation_service',
           'overview_orchestrator', 'search_service', 'types',
           'data_export', 'file_operations', 'entity_counts',
           'background_jobs', 'facade', 'queries', 'statistics',
           'data_access', 'relationships', 'accessibility',
           'preferences', 'profile', 'notifications', 'metadata',
           'processing', 'storage', 'upload',
           'geographic_report', 'intelligence_report', 'quality_report',
           'seasonal_report', 'technician_report',
          ].includes(baseName)) {
        continue;
      }

      // Direct match
      let domain = filePrefixToDomain[baseName];

      // Prefix match (e.g. task_crud -> tasks)
      if (!domain) {
        for (const [prefix, d] of Object.entries(filePrefixToDomain)) {
          if (baseName.startsWith(prefix + '_')) {
            domain = d;
            break;
          }
        }
      }

      if (domain) {
        detected.push(relativePath);
      }
    }
  }

  return detected;
}

function isTrivialFacade(contents) {
  const stripped = stripRustComments(contents).replace(/\s+/g, ' ').trim();
  const hasUnitStruct = /pub\s+struct\s+[A-Za-z0-9_]+\s*;/.test(stripped);
  const hasNewOnly =
    /impl\s+[A-Za-z0-9_]+\s*\{\s*pub\s+fn\s+new\s*\([^)]*\)\s*->\s*Self\s*\{\s*Self\s*\}\s*\}/.test(
      stripped
    );
  return hasUnitStruct && hasNewOnly;
}

function checkStrictScaffoldModules() {
  const files = listFiles(domainsRoot).filter((file) => file.endsWith('.rs'));
  const violations = [];
  for (const file of files) {
    const contents = fs.readFileSync(file, 'utf8');
    if (strictScaffoldMarkers.some((marker) => contents.includes(marker))) {
      violations.push(file);
    }
  }
  return violations;
}

function checkStrictTrivialFacades() {
  const entries = fs.readdirSync(domainsRoot, { withFileTypes: true });
  const violations = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const facadePath = path.join(domainsRoot, entry.name, 'facade.rs');
    if (!fs.existsSync(facadePath)) continue;
    const contents = fs.readFileSync(facadePath, 'utf8');
    if (isTrivialFacade(contents)) {
      violations.push(facadePath);
    }
  }

  return violations;
}

function checkStrictTrivialFacadeTests() {
  const files = listFiles(domainsRoot).filter(
    (file) => file.endsWith('.rs') && file.includes(`${path.sep}tests${path.sep}`)
  );
  const violations = [];
  for (const file of files) {
    const contents = fs.readFileSync(file, 'utf8');
    if (/facade_constructs\s*\(/.test(contents)) {
      violations.push(file);
    }
  }
  return violations;
}

function main() {
  if (!fs.existsSync(domainsRoot)) {
    console.error('Domains directory not found.');
    process.exit(1);
  }

  const sqlViolations = checkSqlUsage();
  const crossDomainViolations = checkBoundedContextImports();
  const apiViolations = checkDomainPublicApi();
  const structureViolations = checkDomainDirectoryStructure();
  const ipcLogicViolations = checkCommandBusinessLogic();
  const domainLocationViolations = checkDomainCodeLocation();
  const placeholderViolations = checkPlaceholderMarkers();
  const legacyShimViolations = checkLegacyShimEnforcement();
  const strictScaffoldViolations = checkStrictScaffoldModules();
  const strictTrivialFacadeViolations = checkStrictTrivialFacades();
  const strictTrivialTestViolations = checkStrictTrivialFacadeTests();

  const violations = [
    ...sqlViolations.map((file) => `SQL usage outside infrastructure: ${file}`),
    ...crossDomainViolations.map((msg) => `Cross-domain access: ${msg}`),
    ...apiViolations.map((msg) => `Public API rule: ${msg}`),
    ...structureViolations.map((msg) => `Domain structure rule: ${msg}`),
    ...ipcLogicViolations.map((msg) => `IPC business logic rule: ${msg}`),
    ...domainLocationViolations.map((file) => `Domain code outside domains/: ${file} - move to domains/<context>/`),
    ...placeholderViolations.map((file) => `Placeholder marker found in domains/: ${file}`),
    ...legacyShimViolations.map((file) => `Legacy module must be domain shim only: ${file}`),
  ];

  const strictViolations = [
    ...strictScaffoldViolations.map((file) => `Scaffold module marker found: ${file}`),
    ...strictTrivialFacadeViolations.map((file) => `Trivial facade found (new-only): ${file}`),
    ...strictTrivialTestViolations.map(
      (file) => `Trivial facade construction test found: ${file}`
    ),
  ];

  if (strictMode) {
    violations.push(...strictViolations);
  } else if (strictViolations.length > 0) {
    console.warn('Architecture check strict-mode findings (non-blocking in progressive mode):');
    for (const warning of strictViolations) {
      console.warn(`- ${warning}`);
    }
    console.warn('Enable strict mode with BOUNDED_CONTEXT_STRICT=1 or --strict to enforce.');
  }

  // Separate allowlisted violations from new ones
  const allowlisted = [];
  const newViolations = [];
  for (const violation of violations) {
    if (crossDomainAllowlist.has(violation)) {
      allowlisted.push(violation);
    } else {
      newViolations.push(violation);
    }
  }

  if (allowlisted.length > 0) {
    console.warn(`Architecture check: ${allowlisted.length} known violation(s) in allowlist (tracked for progressive fix).`);
  }

  if (newViolations.length > 0) {
    console.error('Architecture check failed — NEW violation(s) detected:');
    for (const violation of newViolations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log(`Architecture check passed${strictMode ? ' (strict mode)' : ''}${allowlisted.length > 0 ? ` (${allowlisted.length} allowlisted)` : ''}.`);
}

main();
