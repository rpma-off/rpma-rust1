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
const LEGACY_ALLOWLIST_PATH = path.join(__dirname, 'legacy-domain-allowlist.json');

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
    .filter((file) => !isInfrastructureFile(file));

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
    const relative = path.relative(domainsRoot, file);
    const domainName = relative.split(path.sep)[0];
    const rawContents = fs.readFileSync(file, 'utf8');
    const contents = stripRustComments(rawContents);
    const isInfra = isInfrastructureFile(file);
    const isTest = isTestFile(file);
    const isIpc = isIpcFile(file);

    const internalMatches = [...contents.matchAll(/crate::domains::([a-zA-Z0-9_]+)::(application|infrastructure|domain|ipc)/g)];
    for (const match of internalMatches) {
      const referencedDomain = match[1];
      const referencedLayer = match[2];
      if (referencedDomain !== domainName) {
        violations.push(
          `${file} imports ${referencedDomain}::${referencedLayer}; cross-domain communication must go through event bus/shared contracts`
        );
      }
    }

    if (/crate::repositories::/.test(contents)) {
      violations.push(`${file} imports legacy repositories`);
    }

    // Domain code must not import from crate::commands:: (use crate::shared::error instead)
    if (/crate::commands::/.test(contents)) {
      violations.push(`${file} imports from commands layer (use crate::shared::error for AppError)`);
    }

    // Only infrastructure (gateway), IPC (boundary adapter), and test files may import crate::services::
    // All other domain layers must not depend on legacy services directly
    const isApplicationInput = file.endsWith(`${path.sep}application${path.sep}input.rs`);
    if (!isInfra && !isTest && !isIpc && !isApplicationInput && /crate::services::/.test(contents)) {
      violations.push(`${file} imports legacy services (move to infrastructure gateway or shared)`);
    }

    if (isIpc && /crate::domains::[a-zA-Z0-9_]+::infrastructure/.test(contents)) {
      violations.push(`${file} imports infrastructure from IPC layer`);
    }
    if (isIpc && /crate::domains::[a-zA-Z0-9_]+::application::[a-zA-Z0-9_]*(validate|rule|policy)/.test(contents)) {
      violations.push(`${file} appears to run business validation from IPC layer`);
    }
    if (isIpc && /fn\s+map_[a-zA-Z0-9_]*error/.test(contents)) {
      violations.push(`${file} defines error mapping logic in IPC layer (move to application/facade)`);
    }
  }

  for (const file of enforcedTouchpoints) {
    if (!fs.existsSync(file)) continue;
    const contents = stripRustComments(fs.readFileSync(file, 'utf8'));
    const matches = [...contents.matchAll(/crate::domains::([a-zA-Z0-9_]+)::(application|infrastructure|domain|ipc)/g)];
    for (const match of matches) {
      violations.push(`${file} imports internal domain module ${match[1]}::${match[2]} (use domain facade only)`);
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
    const contents = fs.readFileSync(modPath, 'utf8');
    const publicMods = contents.match(/^\s*pub\s+mod\s+/gm) || [];
    if (publicMods.length > 0) {
      violations.push(`${modPath} should not expose pub mod declarations`);
    }

    const facadeUses = contents.match(/^\s*pub\(crate\)\s+use\s+[^;]+;/gm) || [];
    if (facadeUses.length !== 1) {
      violations.push(`${modPath} should expose a single public facade`);
    }
    if (facadeUses.some((line) => line.includes('crate::repositories'))) {
      violations.push(`${modPath} should not re-export repositories`);
    }
    if (facadeUses.some((line) => line.includes('crate::models'))) {
      violations.push(`${modPath} should not re-export models`);
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

/**
 * Rule 6: Domain code must live under src-tauri/src/domains/.
 *
 * Scans the legacy directories (commands/, models/, repositories/, services/)
 * for files that belong to a bounded context. Known legacy files are tracked
 * in legacy-domain-allowlist.json. Any NEW domain-specific file added outside
 * domains/ causes a failure, enforcing that all new domain code goes into the
 * proper bounded context directory.
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

  // Load allowlist
  let allowed = [];
  if (fs.existsSync(LEGACY_ALLOWLIST_PATH)) {
    const raw = JSON.parse(fs.readFileSync(LEGACY_ALLOWLIST_PATH, 'utf8'));
    allowed = Array.isArray(raw.allowed) ? raw.allowed : [];
  }
  const allowSet = new Set(allowed);

  const violations = detected.filter((f) => !allowSet.has(f));
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

  const violations = [
    ...sqlViolations.map((file) => `SQL usage outside infrastructure: ${file}`),
    ...crossDomainViolations.map((msg) => `Cross-domain access: ${msg}`),
    ...apiViolations.map((msg) => `Public API rule: ${msg}`),
    ...structureViolations.map((msg) => `Domain structure rule: ${msg}`),
    ...ipcLogicViolations.map((msg) => `IPC business logic rule: ${msg}`),
    ...domainLocationViolations.map((file) => `Domain code outside domains/: ${file} — move to domains/<context>/`),
  ];

  if (violations.length > 0) {
    console.error('Architecture check failed:');
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log('Architecture check passed.');
}

main();
