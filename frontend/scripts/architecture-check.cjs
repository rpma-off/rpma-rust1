#!/usr/bin/env node

/**
 * Architecture Guardrail Check Script
 *
 * Validates frontend code follows DDD principles:
 * 1. No direct IPC calls in domain components
 * 2. No cross-domain imports
 * 3. No domain internal imports from app files
 * 4. No god files (>800 lines, warn at 500)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../');
const SRC = path.join(ROOT, 'src');
const DOMAINS = path.join(SRC, 'domains');
const APP = path.join(SRC, 'app');

// Error tracking
let errors = [];
let warnings = [];

// Utility functions
function getAllFiles(dir, ext = ['.ts', '.tsx']) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, ext));
    } else if (entry.isFile() && ext.some(e => entry.name.endsWith(e))) {
      files.push(fullPath);
    }
  }
  return files;
}

function getFileLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch (e) {
    return 0;
  }
}

function isInside(dir, filePath) {
  const relative = path.relative(dir, filePath);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function getRelativePath(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

// Check 1: No direct IPC in domain components
function checkDirectIPCInComponents() {
  console.log('Checking for direct IPC calls in domain components...');
  const componentsDirs = fs.readdirSync(DOMAINS, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(DOMAINS, d.name, 'components'))
    .filter(d => fs.existsSync(d));

  const patterns = [
    /@tauri-apps\/api\/core\/invoke\b/,
    /@tauri-apps\/api\b.*invoke/,
    /\bsafeInvoke\s*\(/,
    /\binvoke\s*\(/,
  ];

  for (const compDir of componentsDirs) {
    const files = getAllFiles(compDir);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of patterns) {
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (pattern.test(line)) {
            errors.push({
              rule: 'NO_DIRECT_IPC_IN_COMPONENTS',
              file: getRelativePath(file),
              line: idx + 1,
              message: `Direct IPC call found: ${line.trim().substring(0, 60)}`
            });
          }
        });
      }
    }
  }
}

// Check 2: No cross-domain imports
function checkCrossDomainImports() {
  console.log('Checking for cross-domain imports...');
  const domainNames = fs.readdirSync(DOMAINS, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const domainDir of domainNames) {
    const domainPath = path.join(DOMAINS, domainDir);
    const files = getAllFiles(domainPath);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        const match = line.match(/from ['"]@\/domains\/([^'"]+)['"]/);
        if (match && match[1]) {
          const importedDomain = match[1].split('/')[0];
          if (importedDomain !== domainDir) {
            const importPath = match[1];
            if (importPath !== importedDomain && !importPath.endsWith('/index')) {
              errors.push({
                rule: 'NO_CROSS_DOMAIN_IMPORTS',
                file: getRelativePath(file),
                line: idx + 1,
                message: `Import from another domain: @/domains/${importPath}`
              });
            }
          }
        }
      });
    }
  }
}

// Check 3: No domain internal imports from app files
function checkAppDomainInternalImports() {
  console.log('Checking for domain internal imports in app files...');
  const appFiles = getAllFiles(APP);

  for (const file of appFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const match = line.match(/from ['"]@\/domains\/([^'"]+)['"]/);
      if (match && match[1]) {
        const parts = match[1].split('/');
        const domain = parts[0];
        const subPath = parts.slice(1).join('/');

        if (subPath && subPath !== 'index' && !subPath.endsWith('/index')) {
          const isApiRoute = file.includes('/api/');
          const isServerImport = subPath === 'server' || subPath.startsWith('server/');

          if (isApiRoute && isServerImport) {
            return;
          }

          errors.push({
            rule: 'NO_DOMAIN_INTERNAL_IMPORTS_IN_APP',
            file: getRelativePath(file),
            line: idx + 1,
            message: `Import from domain internal: @/domains/${match[1]}`
          });
        }
      }
    });
  }
}

// Check 4: No god files
function checkGodFiles() {
  console.log('Checking for god files...');
  const domainFiles = getAllFiles(DOMAINS);

  for (const file of domainFiles) {
    const lines = getFileLines(file);
    if (lines > 800) {
      errors.push({
        rule: 'NO_GOD_FILES_800',
        file: getRelativePath(file),
        line: 1,
        message: `File too large: ${lines} lines (max 800)`
      });
    } else if (lines > 500) {
      warnings.push({
        rule: 'GOD_FILES_WARNING_500',
        file: getRelativePath(file),
        line: 1,
        message: `File large: ${lines} lines (warn at 500, max 800)`
      });
    }
  }
}

// Run all checks
function main() {
  console.log('='.repeat(60));
  console.log('Running Architecture Guardrail Checks');
  console.log('='.repeat(60));
  console.log();

  checkDirectIPCInComponents();
  checkCrossDomainImports();
  checkAppDomainInternalImports();
  checkGodFiles();

  console.log();
  console.log('='.repeat(60));
  console.log('Results');
  console.log('='.repeat(60));

  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${warnings.length}):`);
    warnings.forEach(w => {
      console.log(`  ${w.rule}: ${w.file}:${w.line}`);
      console.log(`    ${w.message}`);
    });
  }

  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    errors.forEach(e => {
      console.log(`  ${e.rule}: ${e.file}:${e.line}`);
      console.log(`    ${e.message}`);
    });
    console.log();
    process.exit(1);
  }

  console.log('\n✅ All architecture checks passed!');
  console.log();
  process.exit(0);
}

main();
