#!/usr/bin/env node
// Reads TypeScript type definitions from stdin (piped from export-types binary)
// and writes them to frontend/src/lib/backend.ts
const fs = require('fs');
const path = require('path');

const outputPath = path.resolve(__dirname, '..', 'frontend', 'src', 'lib', 'backend.ts');

let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  if (!data.trim()) {
    process.stderr.write('❌ write-types.js received empty input — backend.ts NOT overwritten\n');
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, data);
  process.stderr.write(`✅ Types written to ${outputPath}\n`);
});
