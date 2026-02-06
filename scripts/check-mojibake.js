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

// Common mojibake signatures from UTF-8 text decoded as Latin-1/Windows-1252.
const mojibakePatterns = [
  /\u00C3[\u0080-\u00BF]/u, // e.g. Ã©, Ã¨
  /\u00C2[\u0080-\u00BF]/u, // e.g. Â«, Â°, Â 
  /\u00E2[\u0080-\u00BF]{1,2}/u, // e.g. â€™, â€¢, â†’
  /\uFFFD/u, // replacement character from decoding loss
  /\u00EF\u00BF\u00BD/u // visible "ï¿½" sequence
];

function isTextFile(filePath) {
  return textExtensions.has(path.extname(filePath).toLowerCase());
}

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') {
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

function hasMojibake(line) {
  return mojibakePatterns.some(pattern => pattern.test(line));
}

if (!fs.existsSync(targetPath)) {
  console.error(`[encoding:check] Target path not found: ${targetArg}`);
  process.exit(2);
}

const files = fs.statSync(targetPath).isDirectory() ? walk(targetPath) : [targetPath];
const findings = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!hasMojibake(lines[i])) {
      continue;
    }
    findings.push({
      file: path.relative(root, file).replace(/\\/g, '/'),
      line: i + 1,
      text: lines[i].trim()
    });
  }
}

if (findings.length > 0) {
  console.error(`[encoding:check] Found ${findings.length} potential mojibake issue(s):`);
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} :: ${finding.text}`);
  }
  process.exit(1);
}

console.log(`[encoding:check] OK - no mojibake signatures found in ${targetArg}`);
