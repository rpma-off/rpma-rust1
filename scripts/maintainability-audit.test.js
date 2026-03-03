const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { analyseTsFile } = require('./maintainability-audit');

function withTempFile(name, content, run) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maintainability-audit-'));
    const filePath = path.join(dir, name);
    fs.writeFileSync(filePath, content, 'utf8');
    try {
        run(filePath);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

test('flags FORCE SPLIT for oversized mixed-responsibility files', () => {
    const functionBlocks = Array.from({ length: 11 }, (_, i) => `
function serviceStep${i}() {
  const payload = fs.readFileSync('x', 'utf8');
  const transformed = payload.split(',').map((item) => item.trim()).filter(Boolean);
  const businessRule = transformed.length > 0 ? 'workflow policy ok' : 'workflow policy missing';
  const validated = businessRule.includes('policy') ? transformed : [];
  console.log(validated);
  return validated;
}
`).join('\n');

    // Keep file size safely above the FORCE SPLIT line threshold (500+ lines).
    const filler = Array.from({ length: 430 }, (_, i) => `const line${i} = ${i};`).join('\n');
    const content = `
import fs from 'fs';
import { query } from './db';
${functionBlocks}
${filler}
`;

    withTempFile('force-split-sample.ts', content, (filePath) => {
        const findings = analyseTsFile(filePath);
        assert.ok(findings.some((f) => f.type === 'force-split'));
    });
});

test('flags FORCE REFACTOR for oversized effect-heavy component', () => {
    // Intentionally effect-heavy/unoptimized test fixture to validate threshold detection.
    const effects = Array.from({ length: 6 }, (_, i) => `useEffect(() => { setCount((v) => v + ${i}); }, []);`).join('\n');
    // Keep component size safely above the FORCE REFACTOR line threshold (200+ lines).
    const ui = Array.from({ length: 210 }, () => '<div className="row" />').join('\n');
    const content = `
import { useEffect, useMemo, useState } from 'react';
export default function HeavyComponent() {
  const [count, setCount] = useState(0);
  ${effects}
  const derivedA = useMemo(() => [count].map((x) => x + 1), [count]);
  const derivedB = [count].map((x) => x * 2);
  const derivedC = count > 1 ? 'ok' : 'ko';
  const derivedD = [count].filter((x) => x > 0);
  return (
    <section>
      ${ui}
      {derivedA.length + derivedB.length + derivedD.length}
      {derivedC}
    </section>
  );
}
`;

    withTempFile('force-refactor-sample.tsx', content, (filePath) => {
        const findings = analyseTsFile(filePath);
        assert.ok(findings.some((f) => f.type === 'force-refactor-component'));
    });
});
