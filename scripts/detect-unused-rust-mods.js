#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const rustRoot = path.join(repoRoot, 'src-tauri', 'src');

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

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function isIgnored(file) {
  return file.endsWith('/main.rs')
    || file.endsWith('/lib.rs')
    || file.includes('/tests/')
    || file.includes('/bin/')
    || file.startsWith('bin/');
}

function main() {
  if (!fs.existsSync(rustRoot)) {
    console.error(`Rust root not found: ${rustRoot}`);
    process.exit(1);
  }

  const rustFiles = listFiles(rustRoot)
    .filter((f) => f.endsWith('.rs'));
  const rustFilesPosix = rustFiles.map((f) => toPosix(path.relative(rustRoot, f)));

  const contentsByFile = new Map();
  for (const rel of rustFilesPosix) {
    const abs = path.join(rustRoot, rel);
    contentsByFile.set(rel, stripRustComments(fs.readFileSync(abs, 'utf8')));
  }

  const candidates = rustFilesPosix
    .filter((f) => !f.endsWith('/mod.rs'))
    .filter((f) => !isIgnored(f));

  const likelyUnused = [];
  for (const file of candidates) {
    const moduleName = path.basename(file, '.rs');
    let referenced = false;

    const modPattern = new RegExp(`\\b(pub\\s+)?mod\\s+${moduleName}\\s*;`);
    const pathPattern = new RegExp(`(::|\\b)${moduleName}(::|\\b)`);

    for (const [otherFile, content] of contentsByFile.entries()) {
      if (otherFile === file) {
        continue;
      }
      if (modPattern.test(content) || pathPattern.test(content)) {
        referenced = true;
        break;
      }
    }

    if (!referenced) {
      likelyUnused.push(file);
    }
  }

  if (likelyUnused.length === 0) {
    console.log('No likely-unused Rust modules detected.');
    process.exit(0);
  }

  console.log(`Likely-unused Rust modules (heuristic): ${likelyUnused.length}`);
  for (const file of likelyUnused.sort()) {
    console.log(`- ${file}`);
  }
}

main();
