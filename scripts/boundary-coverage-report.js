#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const FRONTEND_SRC = path.join(REPO_ROOT, 'frontend', 'src');

const SCAN_ROOTS = ['app', 'components', 'hooks', 'shared', 'domains'].map((segment) =>
  path.join(FRONTEND_SRC, segment)
);

const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx']);

const EXCLUDE_PATTERNS = [
  /[\\/]__tests__[\\/]/,
  /\.test\.[tj]sx?$/,
  /\.spec\.[tj]sx?$/,
  /(^|[\\/])domains[\\/][^\\/]+[\\/]server[\\/]/,
];

const SHARED_DOMAIN_FEATURE_WRAPPER_PATTERN =
  /^shared\/ui\/(analytics|dashboard|messages|settings|users|PhotoUpload|calendar|SignatureCapture)(\/|$)/;

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) continue;
    out.push(fullPath);
  }

  return out;
}

function normalizePath(filePath) {
  return path.relative(FRONTEND_SRC, filePath).replace(/\\/g, '/');
}

function isExcluded(relativePath) {
  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(relativePath));
}

function extractImportSpecifiers(contents) {
  const specs = new Set();

  const importExportPattern = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  const dynamicImportPattern = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

  let match;
  while ((match = importExportPattern.exec(contents)) !== null) {
    specs.add(match[1]);
  }

  while ((match = dynamicImportPattern.exec(contents)) !== null) {
    specs.add(match[1]);
  }

  return [...specs];
}

function detectViolations(relativePath, specifier) {
  const violations = [];

  const isLegacyServiceImport =
    specifier.startsWith('@/lib/services') || specifier.startsWith('@/lib/ipc/domains');

  if (isLegacyServiceImport) {
    violations.push({
      rule: 'legacy-services-import',
      message: 'Do not import from @/lib/services or @/lib/ipc/domains outside sanctioned server facades.',
    });
  }

  const isAppApiFile = relativePath.startsWith('app/api/');
  const isAppUiFile = relativePath.startsWith('app/') && !isAppApiFile;
  const isDomainImport = specifier.startsWith('@/domains/');
  const isDomainServerImport = /^@\/domains\/[^/]+\/server(?:\/.*)?$/.test(specifier);
  const isDomainServerConsumer =
    isAppApiFile || /^domains\/[^/]+\/server(?:\/|$)/.test(relativePath);

  if (isAppApiFile && isDomainImport && !isDomainServerImport) {
    violations.push({
      rule: 'app-api-domain-server-only',
      message: 'Route handlers in src/app/api must import domains only via @/domains/<domain>/server.',
    });
  }

  if (isAppUiFile && isDomainServerImport) {
    violations.push({
      rule: 'app-ui-no-server-import',
      message: 'UI files in src/app must use domain public APIs (e.g. @/domains/<domain>), not /server facades.',
    });
  }

  if (isDomainServerImport && !isDomainServerConsumer) {
    violations.push({
      rule: 'server-facade-outside-route-layer',
      message:
        'Only src/app/api and domain server facades may import @/domains/<domain>/server.',
    });
  }

  const isDomainFile = relativePath.startsWith('domains/');
  const isNonDomainDeepImport = /^@\/domains\/[^/]+\/(services|ipc|hooks|components)\b/.test(specifier);
  if (!isDomainFile && isNonDomainDeepImport) {
    violations.push({
      rule: 'non-domain-deep-import',
      message: 'Non-domain layers must not import deep domain internals (services/ipc/hooks/components).',
    });
  }

  if (SHARED_DOMAIN_FEATURE_WRAPPER_PATTERN.test(relativePath) && specifier.startsWith('@/components/')) {
    violations.push({
      rule: 'shared-domain-feature-wrapper',
      message:
        'Shared layer must not wrap domain/feature modules from src/components. Import domain APIs directly.',
    });
  }

  return violations;
}

function getLayer(relativePath) {
  if (relativePath.startsWith('app/api/')) return 'app/api';
  return relativePath.split('/')[0];
}

function collectViolations() {
  const files = SCAN_ROOTS.flatMap((root) => walkFiles(root));
  const violations = [];

  for (const filePath of files) {
    const relativePath = normalizePath(filePath);
    if (isExcluded(relativePath)) continue;

    const contents = fs.readFileSync(filePath, 'utf8');
    const specifiers = extractImportSpecifiers(contents);

    for (const specifier of specifiers) {
      const hits = detectViolations(relativePath, specifier);
      for (const hit of hits) {
        violations.push({
          file: relativePath,
          spec: specifier,
          layer: getLayer(relativePath),
          rule: hit.rule,
          message: hit.message,
        });
      }
    }
  }

  return violations;
}

function printReport(violations) {
  const byLayer = new Map();
  for (const violation of violations) {
    byLayer.set(violation.layer, (byLayer.get(violation.layer) || 0) + 1);
  }

  console.log('\nBoundary Coverage Report');
  console.log('========================');
  console.log(`Total violations: ${violations.length}`);

  if (violations.length === 0) {
    console.log('No boundary violations found.');
    return;
  }

  console.log('\nBy layer:');
  for (const [layer, count] of [...byLayer.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`- ${layer}: ${count}`);
  }

  console.log('\nViolations:');
  for (const violation of violations) {
    console.log(`- [${violation.rule}] ${violation.file} -> ${violation.spec}`);
  }
}

if (require.main === module) {
  const violations = collectViolations();
  printReport(violations);
}

module.exports = {
  collectViolations,
};
