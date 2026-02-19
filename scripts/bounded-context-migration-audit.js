#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const BACKEND_SRC = path.join(REPO_ROOT, 'src-tauri', 'src');
const FRONTEND_SRC = path.join(REPO_ROOT, 'frontend', 'src');

const strictMode =
  process.env.BOUNDED_CONTEXT_STRICT === '1' ||
  process.env.BOUNDED_CONTEXT_STRICT === 'true' ||
  process.argv.includes('--strict');

const LEGACY_SHIM_MARKER = 'Legacy compatibility shim for bounded-context migration.';
const SCAFFOLD_MARKER = 'Domain layer module index.';

function walkFiles(dir, extFilter = null) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath, extFilter));
      continue;
    }

    if (!entry.isFile()) continue;
    if (extFilter && !extFilter.has(path.extname(entry.name))) continue;
    files.push(fullPath);
  }

  return files;
}

function relative(p) {
  return path.relative(REPO_ROOT, p).replace(/\\/g, '/');
}

function countByPattern(files, predicate) {
  const hits = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (predicate(content, file)) {
      hits.push(file);
    }
  }
  return hits;
}

function isTrivialFacade(content) {
  const stripped = content
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const hasUnitStruct = /pub\s+struct\s+[A-Za-z0-9_]+\s*;/.test(stripped);
  const hasNewOnly =
    /impl\s+[A-Za-z0-9_]+\s*\{\s*pub\s+fn\s+new\s*\([^)]*\)\s*->\s*Self\s*\{\s*Self\s*\}\s*\}/.test(
      stripped
    );

  return hasUnitStruct && hasNewOnly;
}

function buildReport() {
  const backendFiles = walkFiles(BACKEND_SRC, new Set(['.rs']));
  const frontendFiles = [
    ...walkFiles(path.join(FRONTEND_SRC, 'domains'), new Set(['.ts', '.tsx'])),
    ...walkFiles(path.join(FRONTEND_SRC, 'app'), new Set(['.ts', '.tsx'])),
    ...walkFiles(path.join(FRONTEND_SRC, 'shared'), new Set(['.ts', '.tsx'])),
  ];

  const shimHits = countByPattern(backendFiles, (content) => content.includes(LEGACY_SHIM_MARKER));
  const scaffoldHits = countByPattern(backendFiles, (content, file) => {
    if (!file.includes(`${path.sep}domains${path.sep}`)) return false;
    return content.includes(SCAFFOLD_MARKER);
  });
  const trivialFacadeTests = countByPattern(backendFiles, (content, file) => {
    if (!file.includes(`${path.sep}domains${path.sep}`)) return false;
    if (!file.includes(`${path.sep}tests${path.sep}`)) return false;
    return /facade_constructs\s*\(/.test(content);
  });
  const trivialFacades = countByPattern(backendFiles, (content, file) => {
    if (!file.endsWith(`${path.sep}facade.rs`)) return false;
    if (!file.includes(`${path.sep}domains${path.sep}`)) return false;
    return isTrivialFacade(content);
  });
  const frontendLegacyImports = countByPattern(frontendFiles, (content) =>
    /@\/lib\/services|@\/lib\/ipc\/domains/.test(content)
  );

  return {
    mode: strictMode ? 'strict' : 'progressive',
    generated_at: new Date().toISOString(),
    counts: {
      backend_legacy_shims: shimHits.length,
      backend_scaffold_modules: scaffoldHits.length,
      backend_trivial_facades: trivialFacades.length,
      backend_trivial_facade_tests: trivialFacadeTests.length,
      frontend_legacy_imports: frontendLegacyImports.length,
    },
    samples: {
      backend_legacy_shims: shimHits.slice(0, 10).map(relative),
      backend_scaffold_modules: scaffoldHits.slice(0, 10).map(relative),
      backend_trivial_facades: trivialFacades.slice(0, 10).map(relative),
      backend_trivial_facade_tests: trivialFacadeTests.slice(0, 10).map(relative),
      frontend_legacy_imports: frontendLegacyImports.slice(0, 10).map(relative),
    },
  };
}

function printReport(report) {
  console.log('\nBounded-Context Migration Audit');
  console.log('===============================');
  console.log(`Mode: ${report.mode}`);
  console.log(`Generated: ${report.generated_at}`);
  console.log('');
  for (const [key, count] of Object.entries(report.counts)) {
    console.log(`- ${key}: ${count}`);
  }

  for (const [key, items] of Object.entries(report.samples)) {
    if (items.length === 0) continue;
    console.log(`\n${key} (sample):`);
    for (const item of items) {
      console.log(`- ${item}`);
    }
  }
}

function shouldFail(report) {
  if (!strictMode) return false;
  return Object.values(report.counts).some((count) => count > 0);
}

function main() {
  const report = buildReport();
  printReport(report);

  if (shouldFail(report)) {
    console.error('\nMigration audit failed in strict mode: unresolved legacy/scaffold artifacts remain.');
    process.exit(1);
  }
}

main();