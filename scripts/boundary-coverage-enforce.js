#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { collectViolations } = require('./boundary-coverage-report');

const ALLOWLIST_PATH = path.resolve(__dirname, 'boundary-coverage-allowlist.json');

function keyOf(entry) {
  return `${entry.rule}::${entry.file}::${entry.spec}`;
}

function readAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) {
    return [];
  }

  const raw = fs.readFileSync(ALLOWLIST_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.allowed) ? parsed.allowed : [];
}

function main() {
  const violations = collectViolations();
  const allowlist = readAllowlist();

  const allowSet = new Set(allowlist.map(keyOf));
  const violationSet = new Set(violations.map(keyOf));

  const unexpected = violations.filter((entry) => !allowSet.has(keyOf(entry)));
  const stale = allowlist.filter((entry) => !violationSet.has(keyOf(entry)));

  console.log('\nBoundary Coverage Enforcement');
  console.log('=============================');
  console.log(`Current violations: ${violations.length}`);
  console.log(`Allowlisted entries: ${allowlist.length}`);
  console.log(`Unexpected violations: ${unexpected.length}`);

  if (stale.length > 0) {
    console.log(`Stale allowlist entries: ${stale.length}`);
    for (const entry of stale) {
      console.log(`- ${entry.file} -> ${entry.spec} [${entry.rule}]`);
    }
  }

  if (unexpected.length > 0) {
    console.error('\nBoundary enforcement failed due to unexpected violations:');
    for (const entry of unexpected) {
      console.error(`- ${entry.file} -> ${entry.spec} [${entry.rule}]`);
    }
    process.exit(1);
  }

  console.log('\nBoundary enforcement passed.');
}

main();

