#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targetArg = process.argv[2] || 'frontend/src';
const targetPath = path.resolve(root, targetArg);

const textExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.css',
  '.scss',
  '.html'
]);

const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

function isTextFile(filePath) {
  return textExtensions.has(path.extname(filePath).toLowerCase());
}

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git' || entry.name === 'dist') {
        continue;
      }
      walk(fullPath, out);
      continue;
    }
    if (isTextFile(fullPath)) {
      out.push(fullPath);
    }
  }
  return out;
}

if (!fs.existsSync(targetPath)) {
  console.error(`[encoding:check] Target path not found: ${targetArg}`);
  process.exit(2);
}

const files = fs.statSync(targetPath).isDirectory() ? walk(targetPath) : [targetPath];
const findings = [];

for (const file of files) {
  const bytes = fs.readFileSync(file);
  try {
    utf8Decoder.decode(bytes);
  } catch {
    findings.push({
      file: path.relative(root, file).replace(/\\/g, '/'),
      line: 0,
      text: 'invalid UTF-8 byte sequence'
    });
    continue;
  }
}

if (findings.length > 0) {
  console.error(`[encoding:check] Found ${findings.length} UTF-8 encoding issue(s):`);
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} :: ${finding.text}`);
  }
  process.exit(1);
}

console.log(`[encoding:check] OK - all checked files are valid UTF-8 in ${targetArg}`);
