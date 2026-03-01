#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const domainsRoot = path.join(repoRoot, 'src-tauri', 'src', 'domains');
const includeTests = process.argv.includes('--include-tests');

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

function stripRustComments(contents) {
  return contents
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function isTestPath(relativePath) {
  return relativePath.includes('/tests/') || relativePath.endsWith('_tests.rs');
}

function main() {
  if (!fs.existsSync(domainsRoot)) {
    console.error(`Domains root not found: ${domainsRoot}`);
    process.exit(1);
  }

  const files = listFiles(domainsRoot)
    .filter((file) => file.endsWith('.rs'));

  const violations = [];
  const pattern = /crate::domains::([a-zA-Z0-9_]+)::(domain|application|infrastructure|ipc)\b/g;

  for (const file of files) {
    const relative = path.relative(domainsRoot, file).replace(/\\/g, '/');
    if (!includeTests && isTestPath(relative)) {
      continue;
    }

    const ownerDomain = relative.split('/')[0];
    const contents = stripRustComments(fs.readFileSync(file, 'utf8'));

    for (const match of contents.matchAll(pattern)) {
      const targetDomain = match[1];
      const targetLayer = match[2];
      if (ownerDomain === targetDomain) {
        continue;
      }
      violations.push(`${relative} -> ${targetDomain}::${targetLayer}`);
    }
  }

  if (violations.length === 0) {
    console.log('No cross-domain internal imports detected.');
    process.exit(0);
  }

  const unique = [...new Set(violations)].sort();
  console.error(`Cross-domain internal imports detected: ${unique.length}`);
  for (const violation of unique) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

main();
