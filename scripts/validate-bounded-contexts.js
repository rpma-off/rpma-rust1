#!/usr/bin/env node

/**
 * Bounded Context Architecture Validator
 *
 * Validates that frontend bounded context rules are followed:
 * 1. Each domain has a non-placeholder public API (api/index.ts)
 * 2. No cross-domain internal imports
 * 3. Shared layer doesn't depend on domains
 * 4. No circular dependencies
 * 5. TypeScript path aliases are correctly configured
 * 6. Domain structure is complete and non-scaffold
 * 7. No placeholder files (.gitkeep) remain in domain components/tests
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const FRONTEND_ROOT = path.join(REPO_ROOT, 'frontend');
const FRONTEND_SRC = path.join(FRONTEND_ROOT, 'src');
const DOMAINS_DIR = path.join(FRONTEND_SRC, 'domains');
const SHARED_DIR = path.join(FRONTEND_SRC, 'shared');
const APP_DIR = path.join(FRONTEND_SRC, 'app');

const SCAFFOLD_MARKERS = [
  'Bounded-context domain scaffold.',
  'Domain - Public API (scaffold)',
  'scaffold',
  'should be added here',
  'currently in api/',
];

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const errors = [];
let checksRun = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  errors.push(message);
}

function section(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(title, 'cyan');
  log('='.repeat(60), 'cyan');
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function hasScaffoldMarker(content) {
  return SCAFFOLD_MARKERS.some((marker) => content.includes(marker));
}

function getDomains() {
  if (!fs.existsSync(DOMAINS_DIR)) return [];

  return fs
    .readdirSync(DOMAINS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('.') && !name.startsWith('_'));
}

function listFilesRecursive(baseDir, extensions = ['.ts', '.tsx']) {
  if (!fs.existsSync(baseDir)) return [];

  const files = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (extensions.includes(path.extname(entry.name))) {
        files.push(fullPath);
      }
    }
  }

  walk(baseDir);
  return files;
}

function relativeFromFrontend(filePath) {
  return path.relative(FRONTEND_SRC, filePath).replace(/\\/g, '/');
}

// ============================================================================
// RULE 1: Public API completeness
// ============================================================================
function validatePublicAPIs() {
  section('RULE 1: Public API Validation');

  const domains = getDomains();
  if (domains.length === 0) {
    error("No domains found under frontend/src/domains.");
    return;
  }

  log(`  Found ${domains.length} domains: ${domains.join(', ')}`);

  for (const domain of domains) {
    checksRun++;
    const apiIndex = path.join(DOMAINS_DIR, domain, 'api', 'index.ts');
    if (!fs.existsSync(apiIndex)) {
      error(`Domain '${domain}' missing public API: ${domain}/api/index.ts`);
      continue;
    }

    const content = readFile(apiIndex);
    if (!content.trim()) {
      error(`Domain '${domain}' has empty public API: ${domain}/api/index.ts`);
      continue;
    }

    if (hasScaffoldMarker(content)) {
      error(`Domain '${domain}' public API contains scaffold marker text: ${domain}/api/index.ts`);
      continue;
    }

    const stripped = stripComments(content).trim();
    if (/^export\s*\{\s*\};?\s*$/.test(stripped)) {
      error(`Domain '${domain}' public API is placeholder-only (export {}): ${domain}/api/index.ts`);
      continue;
    }

    const hasProviderExport = /export\s+.*Provider/.test(content);
    const hasHookExport = /export\s+.*use[A-Z_a-zA-Z0-9]*/.test(content);
    const hasTypeExport = /export\s+type\s+/.test(content);

    if (!hasProviderExport) {
      error(`Domain '${domain}' must export at least one Provider from api/index.ts`);
    }
    if (!hasHookExport) {
      error(`Domain '${domain}' must export at least one hook from api/index.ts`);
    }
    if (!hasTypeExport) {
      error(`Domain '${domain}' must export at least one type from api/index.ts`);
    }

    if (hasProviderExport && hasHookExport && hasTypeExport) {
      log(`  OK Domain '${domain}' public API complete`, 'green');
    }
  }
}

// ============================================================================
// RULE 2: No cross-domain internal imports
// ============================================================================
function validateNoInternalImports() {
  section('RULE 2: No Cross-Domain Internal Imports');

  const domains = getDomains();
  if (domains.length === 0) return;

  for (const domain of domains) {
    const domainDir = path.join(DOMAINS_DIR, domain);
    const files = listFilesRecursive(domainDir);

    for (const file of files) {
      const rel = relativeFromFrontend(file);
      const content = readFile(file);
      checksRun++;

      // Cross-domain deep imports (allow same-domain deep imports)
      const deepImportPattern = /@\/domains\/([a-zA-Z0-9_-]+)\/(services|ipc|hooks|components)\b/g;
      let match;
      while ((match = deepImportPattern.exec(content)) !== null) {
        const importedDomain = match[1];
        const importedLayer = match[2];
        const ownDomainPrefix = `domains/${importedDomain}/`;
        if (!rel.startsWith(ownDomainPrefix)) {
          error(`${rel}\n  imports internal module '@/domains/${importedDomain}/${importedLayer}'\n  Use '@/domains/${importedDomain}' instead.`);
        }
      }

      // Relative traversal outside domain internals
      const badRelativePattern = /from\s+['"]\.\.\/\.\.\/\.\.\/(\w+)\/(services|ipc|hooks|components)/g;
      while ((match = badRelativePattern.exec(content)) !== null) {
        error(`${rel}\n  deep relative import detected (${match[0]}). Use domain alias imports.`);
      }
    }
  }

  // App (including app/api) must not import deep domain internals
  const appFiles = listFilesRecursive(APP_DIR);
  for (const file of appFiles) {
    const rel = relativeFromFrontend(file);
    const content = readFile(file);
    checksRun++;

    const internalImportPattern = /@\/domains\/[a-zA-Z0-9_-]+\/(services|ipc|hooks|components)\b/g;
    let match;
    while ((match = internalImportPattern.exec(content)) !== null) {
      error(`${rel}\n  imports internal domain module '${match[0]}'. Use '@/domains/<domain>' (UI) or '@/domains/<domain>/server' (route handlers).`);
    }
  }

  if (errors.filter((item) => item.includes('imports internal module')).length === 0) {
    log('  OK No cross-domain internal imports found', 'green');
  }
}

// ============================================================================
// RULE 3: Shared must not depend on domains
// ============================================================================
function validateSharedIndependence() {
  section('RULE 3: Shared Layer Independence');

  if (!fs.existsSync(SHARED_DIR)) {
    error('Shared directory not found: frontend/src/shared');
    return;
  }

  const files = listFilesRecursive(SHARED_DIR);
  for (const file of files) {
    const rel = relativeFromFrontend(file);
    const content = readFile(file);
    checksRun++;

    if (!content.includes('@/domains/') && !content.includes('../domains/')) continue;

    const importPattern = /@\/domains\/([a-zA-Z0-9_-]+)|\.\.\/domains\/([a-zA-Z0-9_-]+)/g;
    let match;
    while ((match = importPattern.exec(content)) !== null) {
      const domain = match[1] || match[2];
      error(`${rel}\n  shared layer imports domain '${domain}'. Shared must remain domain-independent.`);
    }
  }

  if (errors.filter((item) => item.includes('shared layer imports domain')).length === 0) {
    log('  OK Shared layer is independent', 'green');
  }
}

// ============================================================================
// RULE 4: No circular dependencies
// ============================================================================
function validateNoCircularDeps() {
  section('RULE 4: No Circular Dependencies');

  const domains = getDomains();
  if (domains.length < 2) {
    checksRun++;
    return;
  }

  const graph = {};
  for (const domain of domains) {
    graph[domain] = new Set();
    const files = listFilesRecursive(path.join(DOMAINS_DIR, domain));
    for (const file of files) {
      const content = readFile(file);
      const importPattern = /@\/domains\/([a-zA-Z0-9_-]+)/g;
      let match;
      while ((match = importPattern.exec(content)) !== null) {
        const imported = match[1];
        if (imported !== domain) graph[domain].add(imported);
      }
    }
  }

  function dfs(node, visited = new Set(), stack = []) {
    if (stack.includes(node)) {
      const startIdx = stack.indexOf(node);
      return stack.slice(startIdx).concat(node);
    }
    if (visited.has(node)) return null;

    visited.add(node);
    stack.push(node);

    for (const dep of graph[node] || []) {
      const cycle = dfs(dep, visited, stack);
      if (cycle) return cycle;
    }

    stack.pop();
    return null;
  }

  const visited = new Set();
  for (const domain of domains) {
    const cycle = dfs(domain, visited, []);
    if (cycle) {
      error(`Circular dependency detected: ${cycle.join(' -> ')}`);
    }
  }

  checksRun++;
  if (errors.filter((item) => item.includes('Circular dependency detected')).length === 0) {
    log('  OK No circular dependencies found', 'green');
  }
}

// ============================================================================
// RULE 5: Path aliases
// ============================================================================
function validatePathAliases() {
  section('RULE 5: TypeScript Path Aliases');

  const tsconfigCandidates = [
    path.join(REPO_ROOT, 'tsconfig.json'),
    path.join(FRONTEND_ROOT, 'tsconfig.json'),
  ];

  const domains = getDomains();

  for (const tsconfigPath of tsconfigCandidates) {
    checksRun++;
    if (!fs.existsSync(tsconfigPath)) {
      error(`Missing TypeScript config: ${path.relative(REPO_ROOT, tsconfigPath)}`);
      continue;
    }

    const tsconfig = JSON.parse(readFile(tsconfigPath));
    const paths = tsconfig.compilerOptions && tsconfig.compilerOptions.paths ? tsconfig.compilerOptions.paths : {};

    for (const domain of domains) {
      const alias = `@/domains/${domain}`;
      const expectedSuffix = `/src/domains/${domain}/api`;
      checksRun++;

      if (!paths[alias] || !Array.isArray(paths[alias]) || paths[alias].length === 0) {
        error(`${path.relative(REPO_ROOT, tsconfigPath)} missing alias '${alias}'`);
        continue;
      }

      const configured = String(paths[alias][0]).replace(/\\/g, '/');
      if (!configured.endsWith(expectedSuffix.replace(REPO_ROOT.replace(/\\/g, '/'), '')) && !configured.endsWith(`./src/domains/${domain}/api`)) {
        error(`${path.relative(REPO_ROOT, tsconfigPath)} alias '${alias}' must point to './src/domains/${domain}/api' (current: '${configured}')`);
      }
    }

    if (!paths['@/shared/*']) {
      error(`${path.relative(REPO_ROOT, tsconfigPath)} missing alias '@/shared/*'`);
    }
  }

  if (errors.filter((item) => item.includes('missing alias')).length === 0) {
    log('  OK Path aliases configured', 'green');
  }
}

// ============================================================================
// RULE 6: Domain structure and scaffold text
// ============================================================================
function validateDomainStructure() {
  section('RULE 6: Domain Structure Validation');

  const domains = getDomains();
  const requiredDirs = ['api', 'components', '__tests__'];

  for (const domain of domains) {
    const domainPath = path.join(DOMAINS_DIR, domain);

    for (const dirName of requiredDirs) {
      checksRun++;
      if (!fs.existsSync(path.join(domainPath, dirName))) {
        error(`Domain '${domain}' missing required directory: ${domain}/${dirName}`);
      }
    }

    const readme = path.join(domainPath, 'README.md');
    checksRun++;
    if (!fs.existsSync(readme)) {
      error(`Domain '${domain}' missing README: ${domain}/README.md`);
    } else if (hasScaffoldMarker(readFile(readme))) {
      error(`Domain '${domain}' README contains scaffold marker text: ${domain}/README.md`);
    }

    const apiIndex = path.join(domainPath, 'api', 'index.ts');
    checksRun++;
    if (fs.existsSync(apiIndex)) {
      const content = readFile(apiIndex);
      if (hasScaffoldMarker(content)) {
        error(`Domain '${domain}' API contains scaffold marker text: ${domain}/api/index.ts`);
      }
    }
  }

  if (errors.filter((item) => item.includes('missing required directory')).length === 0) {
    log('  OK Domain structures validated', 'green');
  }
}

// ============================================================================
// RULE 7: Placeholder files
// ============================================================================
function validateNoDomainPlaceholders() {
  section('RULE 7: Placeholder File Validation');

  const domains = getDomains();
  const placeholderDirs = ['components', '__tests__'];

  for (const domain of domains) {
    for (const dirName of placeholderDirs) {
      checksRun++;
      const placeholderPath = path.join(DOMAINS_DIR, domain, dirName, '.gitkeep');
      if (fs.existsSync(placeholderPath)) {
        error(`Domain '${domain}' still contains placeholder file: ${domain}/${dirName}/.gitkeep`);
      }
    }
  }

  if (errors.filter((item) => item.includes('placeholder file')).length === 0) {
    log('  OK No domain .gitkeep placeholder files found', 'green');
  }
}

function main() {
  log('\nBounded Context Architecture Validator', 'blue');
  log('======================================\n', 'blue');

  const start = Date.now();

  validatePublicAPIs();
  validateNoInternalImports();
  validateSharedIndependence();
  validateNoCircularDeps();
  validatePathAliases();
  validateDomainStructure();
  validateNoDomainPlaceholders();

  section('SUMMARY');

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  log(`\n  Checks run: ${checksRun}`, 'cyan');
  log(`  Duration: ${duration}s`, 'cyan');

  if (errors.length === 0) {
    log('\n  OK All architecture rules passed.', 'green');
    process.exit(0);
  }

  log(`\n  FAIL ${errors.length} error(s) found:`, 'red');
  for (const item of errors) {
    log(`\n- ${item}`, 'red');
  }

  log('\n  Architecture validation failed.\n', 'red');
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = {
  validatePublicAPIs,
  validateNoInternalImports,
  validateSharedIndependence,
  validateNoCircularDeps,
  validatePathAliases,
  validateDomainStructure,
  validateNoDomainPlaceholders,
};
