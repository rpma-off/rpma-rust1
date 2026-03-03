#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const strict = process.argv.includes('--strict');

const tsLikeExtensions = new Set(['.ts', '.tsx']);
const rustExtensions = new Set(['.rs']);

function listFilesRecursive(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(full));
      continue;
    }
    files.push(full);
  }
  return files;
}

function normalize(filePath) {
  return filePath.replace(/\\/g, '/');
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function isFrontendSource(filePath) {
  const n = normalize(filePath);
  return n.includes('/frontend/src/') && tsLikeExtensions.has(path.extname(filePath));
}

function isRustSource(filePath) {
  const n = normalize(filePath);
  return n.includes('/src-tauri/src/') && rustExtensions.has(path.extname(filePath));
}

function isTestLike(filePath) {
  const n = normalize(filePath);
  return n.includes('/__tests__/') || n.includes('/tests/') || /\.test\./.test(n) || /\.spec\./.test(n);
}

function checkInvokeDiscipline(frontendFiles) {
  const violations = [];
  for (const file of frontendFiles) {
    const n = normalize(file);
    if (
      n.endsWith('/frontend/src/lib/ipc/utils.ts') ||
      n.endsWith('/frontend/src/lib/ipc/mock/mock-controls.ts') ||
      isTestLike(file)
    ) {
      continue;
    }

    const content = read(file);
    if (/\binvoke\s*\(/.test(content)) {
      violations.push(`${n}: raw invoke() usage is forbidden outside safeInvoke entrypoints`);
    }
    if (/from\s+['"]@tauri-apps\/api\/core['"]/.test(content) && /\binvoke\b/.test(content)) {
      violations.push(`${n}: direct @tauri-apps/api/core invoke import is forbidden`);
    }
  }
  return violations;
}

function checkCrossDomainDeepImports(frontendFiles) {
  const violations = [];
  const deepPattern = /from\s+['"]@\/domains\/([a-zA-Z0-9_-]+)\/(services|ipc|hooks|components)\b[^'"]*['"]/g;

  for (const file of frontendFiles) {
    const n = normalize(file);
    const match = n.match(/\/frontend\/src\/domains\/([a-zA-Z0-9_-]+)\//);
    if (!match) continue;
    const sourceDomain = match[1];

    const content = read(file);
    let m;
    while ((m = deepPattern.exec(content)) !== null) {
      const targetDomain = m[1];
      if (targetDomain !== sourceDomain) {
        violations.push(`${n}: cross-domain deep import from ${sourceDomain} -> ${targetDomain} is forbidden`);
      }
    }
  }

  return violations;
}

function checkSqlOutsideInfrastructure(rustFiles) {
  const violations = [];
  const sqlLiteralPattern =
    /"[^"\n]*(SELECT\s+|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|PRAGMA\s+|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)[^"\n]*"/;
  const sqlPattern =
    /\.query_row\s*\(|\.query_as\s*\(|\b(conn|db|tx)\.execute\s*\(|\b(conn|db|tx)\.execute_batch\s*\(|\.prepare\s*\(/;

  for (const file of rustFiles) {
    const n = normalize(file);
    if (
      n.includes('/src-tauri/src/db/') ||
      n.includes('/src-tauri/src/domains/') && n.includes('/infrastructure/') ||
      n.includes('/src-tauri/src/shared/db/') ||
      n.includes('/src-tauri/src/tests/') ||
      n.endsWith('/src-tauri/src/smoke_tests.rs') ||
      n.endsWith('/src-tauri/src/test_utils.rs') ||
      n.includes('/src-tauri/src/bin/') ||
      n.endsWith('/src-tauri/src/main.rs') ||
      isTestLike(file)
    ) {
      continue;
    }

    const content = read(file);
    if (sqlPattern.test(content) || sqlLiteralPattern.test(content)) {
      violations.push(`${n}: SQL/DB pattern detected outside infrastructure/shared db`);
    }
  }
  return violations;
}

function checkIpcBusinessLogic(rustFiles) {
  const violations = [];
  const validationFnPattern = /\bfn\s+validate_[a-zA-Z0-9_]+\s*\(/;

  for (const file of rustFiles) {
    const n = normalize(file);
    if (!(n.includes('/src-tauri/src/domains/') && n.includes('/ipc/')) && !n.includes('/src-tauri/src/commands/')) {
      continue;
    }
    if (isTestLike(file)) continue;

    const content = read(file);
    if (validationFnPattern.test(content)) {
      violations.push(`${n}: local validation function found in IPC/command layer`);
    }
  }
  return violations;
}

function printViolations(header, items) {
  if (items.length === 0) return;
  console.error(`\n${header}`);
  for (const item of items) {
    console.error(`  - ${item}`);
  }
}

function main() {
  const allFiles = listFilesRecursive(repoRoot);
  const frontendFiles = allFiles.filter(isFrontendSource);
  const rustFiles = allFiles.filter(isRustSource);

  const invokeViolations = checkInvokeDiscipline(frontendFiles);
  const sqlViolations = checkSqlOutsideInfrastructure(rustFiles);
  const crossDomainViolations = strict ? checkCrossDomainDeepImports(frontendFiles) : [];
  const ipcLogicViolations = strict ? checkIpcBusinessLogic(rustFiles) : [];

  const violations = [
    ...invokeViolations,
    ...sqlViolations,
    ...crossDomainViolations,
    ...ipcLogicViolations,
  ];

  printViolations('Anti-Spaghetti Guard Violations', violations);

  if (violations.length > 0) {
    process.exit(1);
  }

  console.log(`Anti-spaghetti guards passed${strict ? ' (strict)' : ''}.`);
}

main();
