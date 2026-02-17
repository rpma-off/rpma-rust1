#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const rustRoot = path.join(repoRoot, 'src-tauri', 'src');
const domainsRoot = path.join(rustRoot, 'domains');
const MIGRATED_DOMAINS = ['inventory'];

const SQL_PATTERNS = [
  /\bSELECT\s+/i,
  /\bINSERT\s+INTO\b/i,
  /\bUPDATE\s+\w+/i,
  /\bDELETE\s+FROM\b/i,
  /\bCREATE\s+TABLE\b/i,
  /rusqlite::params!/,
];

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else if (entry.isFile() && full.endsWith('.rs')) out.push(full);
  }
  return out;
}

function normalize(p) {
  return p.split(path.sep).join('/');
}

const rustFiles = listFiles(rustRoot);
const errors = [];

for (const file of rustFiles) {
  const n = normalize(file);
  const inDomains = n.includes('/src-tauri/src/domains/');
  const inInfra = /\/src-tauri\/src\/domains\/[^/]+\/infrastructure\//.test(n);
  const inSharedDb = n.includes('/src-tauri/src/shared/db/');
  if (!inDomains) continue; // guardrail focuses on migrated bounded-context modules

  if (!inInfra && !inSharedDb) {
    const content = fs.readFileSync(file, 'utf8');
    for (const pattern of SQL_PATTERNS) {
      if (pattern.test(content)) {
        errors.push(`SQL pattern outside infrastructure: ${n}`);
        break;
      }
    }
  }
}

for (const file of rustFiles) {
  const n = normalize(file);
  const m = n.match(/\/src-tauri\/src\/domains\/([^/]+)\//);
  if (!m) continue;
  const domain = m[1];
  const content = fs.readFileSync(file, 'utf8');

  const infraImports = [...content.matchAll(/crate::domains::([a-z_]+)::infrastructure/g)].map((x) => x[1]);
  for (const other of infraImports) {
    if (other !== domain) {
      errors.push(`Cross-domain infrastructure import forbidden (${domain} -> ${other}) in ${n}`);
    }
  }

  const repoImports = [...content.matchAll(/crate::repositories::([a-z_]+)/g)].map((x) => x[1]);
  if (repoImports.length > 0 && !MIGRATED_DOMAINS.includes(domain)) {
    // Keep legacy domains untouched during migration; only enforce strictly for migrated inventory context
    continue;
  }
  if (repoImports.length > 0 && MIGRATED_DOMAINS.includes(domain)) {
    errors.push(`Inventory domain should not import legacy repositories directly: ${n}`);
  }
}

for (const modFile of listFiles(domainsRoot).filter((f) => f.endsWith('/mod.rs'))) {
  const n = normalize(modFile);
  const domainMatch = n.match(/\/src-tauri\/src\/domains\/([^/]+)\/mod.rs$/);
  if (!domainMatch) continue;
  const domain = domainMatch[1];
  const content = fs.readFileSync(modFile, 'utf8');
  const hasPublicInternalModule = /pub\s+mod\s+(domain|infrastructure|ipc)\s*;/.test(content);
  if (hasPublicInternalModule) {
    errors.push(`Domain ${domain} exposes internal modules publicly in ${n}`);
  }
}

if (errors.length) {
  console.error('Architecture checks failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('Architecture checks passed.');
