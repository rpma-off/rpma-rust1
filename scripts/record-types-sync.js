#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const gitDir = path.join(rootDir, '.git');

if (!fs.existsSync(gitDir)) {
  process.stderr.write(`❌ Cannot record types:sync timestamp because ${gitDir} does not exist\n`);
  process.exit(1);
}

const stampFile = path.join(gitDir, 'types-sync-stamp');
fs.writeFileSync(stampFile, `${Date.now()}\n`, 'utf8');
process.stderr.write(`✅ Recorded types:sync timestamp in ${stampFile}\n`);
