#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const domainsRoot = path.join(repoRoot, 'src-tauri', 'src', 'domains');
const sharedRoot = path.join(repoRoot, 'src-tauri', 'src', 'shared');

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

  return violations;
}

function checkCrossDomainInfrastructure() {
  const files = listFiles(domainsRoot)
    .filter((file) => file.endsWith('.rs'))
    .filter((file) => !isInfrastructureFile(file));

  const violations = [];
  for (const file of files) {
    const relative = path.relative(domainsRoot, file);
    const domainName = relative.split(path.sep)[0];
    const contents = fs.readFileSync(file, 'utf8');
    const matches = contents.match(/crate::domains::([a-zA-Z0-9_]+)::infrastructure/g) || [];

    for (const match of matches) {
      const [, referencedDomain] = match.match(/crate::domains::([a-zA-Z0-9_]+)::infrastructure/) || [];
      if (referencedDomain && referencedDomain !== domainName) {
        violations.push(`${file} imports ${referencedDomain} infrastructure`);
      }
    }

    if (/crate::repositories::/.test(contents)) {
      violations.push(`${file} imports legacy repositories`);
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

    const publicUses = contents.match(/^\s*pub\s+use\s+[^;]+;/gm) || [];
    if (publicUses.length > 1) {
      violations.push(`${modPath} should expose a single public facade`);
    }
    if (publicUses.some((line) => line.includes('crate::repositories'))) {
      violations.push(`${modPath} should not re-export repositories`);
    }
    if (publicUses.some((line) => line.includes('crate::models'))) {
      violations.push(`${modPath} should not re-export models`);
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
  const crossDomainViolations = checkCrossDomainInfrastructure();
  const apiViolations = checkDomainPublicApi();

  const violations = [
    ...sqlViolations.map((file) => `SQL usage outside infrastructure: ${file}`),
    ...crossDomainViolations.map((msg) => `Cross-domain access: ${msg}`),
    ...apiViolations.map((msg) => `Public API rule: ${msg}`),
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
