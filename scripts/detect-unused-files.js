#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(repoRoot, 'frontend', 'src');
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

const ENTRYPOINT_RE = /(?:^|[\\/])(page|layout|loading|error|global-error|not-found|route|middleware)\.(?:ts|tsx|js|jsx)$/;
const TEST_RE = /(?:^|[\\/])(__tests__|__mocks__|mocks)[\\/]|(?:^|[\\/]).*\.(?:test|spec)\.(?:ts|tsx|js|jsx)$/;
const GENERATED_RE = /(?:^|[\\/])types[\\/].*\.ts$/;

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (extensions.has(path.extname(full))) out.push(full);
  }
}

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function resolveSpec(fromFile, spec) {
  if (spec.startsWith('@/')) return [path.join(srcRoot, spec.slice(2))];
  if (spec.startsWith('.')) return [path.resolve(path.dirname(fromFile), spec)];
  return [];
}

function candidateFiles(base) {
  return [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
  ];
}

const files = [];
walk(srcRoot, files);
const fileSet = new Set(files.map((f) => path.resolve(f)));
const incoming = new Map(files.map((f) => [path.resolve(f), 0]));

const importRe = /(?:import|export)\s+(?:[^'";]+?from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = importRe.exec(content)) !== null) {
    const spec = match[1] || match[2] || match[3];
    if (!spec) continue;

    for (const base of resolveSpec(file, spec)) {
      for (const candidate of candidateFiles(base)) {
        const resolved = path.resolve(candidate);
        if (fileSet.has(resolved)) {
          incoming.set(resolved, (incoming.get(resolved) || 0) + 1);
        }
      }
    }
  }
}

function isPublicBarrel(file) {
  const rel = toPosix(path.relative(srcRoot, file));
  return (
    rel.endsWith('/index.ts') &&
    (rel.includes('/domains/') || rel.startsWith('shared/') || rel.startsWith('lib/') || rel === 'hooks/index.ts')
  );
}

const unused = [];
for (const [file, count] of incoming.entries()) {
  const rel = toPosix(path.relative(srcRoot, file));
  if (count > 0) continue;
  if (ENTRYPOINT_RE.test(rel)) continue;
  if (TEST_RE.test(rel)) continue;
  if (GENERATED_RE.test(rel)) continue;
  if (isPublicBarrel(file)) continue;
  unused.push(rel);
}

unused.sort();
console.log(`Potentially unused files: ${unused.length}`);
for (const rel of unused) console.log(`- frontend/src/${rel}`);
