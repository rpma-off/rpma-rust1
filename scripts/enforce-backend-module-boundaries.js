#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const domainsRoot = path.join(repoRoot, 'src-tauri', 'src', 'domains');
const allowlistPath = path.join(__dirname, 'backend-boundary-allowlist.json');

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

function loadAllowlist() {
  try {
    const parsed = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
    return {
      imports: new Set(parsed.allowed || []),
      structure: new Set(parsed.allowed_structure || []),
      ipc_infra: new Set(parsed.allowed_ipc_infra || []),
    };
  } catch {
    return { imports: new Set(), structure: new Set(), ipc_infra: new Set() };
  }
}

function checkCrossDomainInfrastructureImports() {
  const violations = [];
  const files = listFiles(domainsRoot).filter((file) => file.endsWith('.rs'));
  const importPattern = /crate::domains::([a-zA-Z0-9_]+)::(infrastructure|db)\b/g;

  for (const file of files) {
    const relative = path.relative(domainsRoot, file).replace(/\\/g, '/');
    const ownDomain = relative.split('/')[0];
    const contents = stripRustComments(fs.readFileSync(file, 'utf8'));

    for (const match of contents.matchAll(importPattern)) {
      const targetDomain = match[1];
      const targetLayer = match[2];
      if (targetDomain === ownDomain) continue;
      violations.push(`${relative} -> ${targetDomain}::${targetLayer}`);
    }
  }

  return [...new Set(violations)];
}

function checkDomainFacadeAndVisibility(structureAllowlist) {
  const violations = [];
  const domainDirs = fs.readdirSync(domainsRoot, { withFileTypes: true }).filter((e) => e.isDirectory());

  for (const dir of domainDirs) {
    const modPath = path.join(domainsRoot, dir.name, 'mod.rs');
    if (!fs.existsSync(modPath)) continue;

    const contents = fs.readFileSync(modPath, 'utf8');
    if (!/^\s*mod\s+facade;\s*$/m.test(contents)) {
      violations.push(`${dir.name}/mod.rs must declare 'mod facade;'`);
    }
    if (!/^\s*pub\(crate\)\s+use\s+facade::[A-Za-z0-9_]+;\s*$/m.test(contents)) {
      violations.push(`${dir.name}/mod.rs must re-export exactly one facade with pub(crate) use`);
    }
    // Check for pub mod domain without feature gate
    // Only flag if the pub mod domain line is NOT preceded by a cfg(feature) attribute
    const lines = contents.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*pub\s+mod\s+domain\s*;\s*$/.test(lines[i])) {
        const prevLine = i > 0 ? lines[i - 1] : '';
        if (!/^\s*#\[cfg\(feature\s*=\s*"export-types"\)\]\s*$/.test(prevLine)) {
          const key = `${dir.name}/mod.rs pub mod domain`;
          if (!structureAllowlist.has(key)) {
            violations.push(`${dir.name}/mod.rs must not expose domain as unconditional public module (use feature gate or pub(crate))`);
          }
        }
      }
      if (/^\s*pub\s+mod\s+infrastructure\s*;\s*$/.test(lines[i])) {
        const prevLine = i > 0 ? lines[i - 1] : '';
        if (!/^\s*#\[cfg\(feature\s*=\s*"export-types"\)\]\s*$/.test(prevLine)) {
          const key = `${dir.name}/mod.rs pub mod infrastructure`;
          if (!structureAllowlist.has(key)) {
            violations.push(`${dir.name}/mod.rs must not expose infrastructure as unconditional public module (use feature gate or pub(crate))`);
          }
        }
      }
    }
  }

  return violations;
}

function checkIpcInfrastructureLeakage(ipcInfraAllowlist) {
  const violations = [];
  const domainDirs = fs.readdirSync(domainsRoot, { withFileTypes: true }).filter((e) => e.isDirectory());

  for (const dir of domainDirs) {
    const ipcDir = path.join(domainsRoot, dir.name, 'ipc');
    if (!fs.existsSync(ipcDir)) continue;

    const ipcFiles = listFiles(ipcDir).filter((f) => f.endsWith('.rs'));
    for (const file of ipcFiles) {
      const relative = path.relative(domainsRoot, file).replace(/\\/g, '/');
      const contents = stripRustComments(fs.readFileSync(file, 'utf8'));
      const infraPattern = /use\s+crate::domains::[a-zA-Z0-9_]+::infrastructure\b/g;
      for (const match of contents.matchAll(infraPattern)) {
        const key = relative;
        if (!ipcInfraAllowlist.has(key)) {
          violations.push(`${relative}: IPC handler imports infrastructure directly (${match[0].trim()})`);
        }
      }
    }
  }

  return [...new Set(violations)];
}

function main() {
  if (!fs.existsSync(domainsRoot)) {
    console.error('Domains root not found:', domainsRoot);
    process.exit(1);
  }

  const allowlist = loadAllowlist();
  const infraViolations = checkCrossDomainInfrastructureImports();
  const newInfraViolations = infraViolations.filter((v) => !allowlist.imports.has(v));
  const structureViolations = checkDomainFacadeAndVisibility(allowlist.structure);
  const ipcLeakageViolations = checkIpcInfrastructureLeakage(allowlist.ipc_infra);

  const hasFailures = newInfraViolations.length > 0 || structureViolations.length > 0 || ipcLeakageViolations.length > 0;

  if (hasFailures) {
    console.error('Backend module boundary enforcement failed.');

    if (newInfraViolations.length > 0) {
      console.error('\nForbidden cross-domain infrastructure/db imports:');
      for (const violation of newInfraViolations) {
        console.error(`- ${violation}`);
      }
    }

    if (structureViolations.length > 0) {
      console.error('\nInvalid domain module guard pattern:');
      for (const violation of structureViolations) {
        console.error(`- ${violation}`);
      }
    }

    if (ipcLeakageViolations.length > 0) {
      console.error('\nIPC layer infrastructure leakage:');
      for (const violation of ipcLeakageViolations) {
        console.error(`- ${violation}`);
      }
    }

    process.exit(1);
  }

  if (infraViolations.length > 0) {
    console.warn(
      `Backend module boundary enforcement: ${infraViolations.length} allowlisted legacy cross-domain infrastructure/db import(s).`
    );
  }

  console.log('Backend module boundary enforcement passed.');
}

main();
