const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDiff, checkViolations } = require('./code-review-check');

test('flags edited generated backend.ts file', () => {
  const diff = `diff --git a/frontend/src/lib/backend.ts b/frontend/src/lib/backend.ts
index 1111111..2222222 100644
--- a/frontend/src/lib/backend.ts
+++ b/frontend/src/lib/backend.ts
@@ -1,1 +1,2 @@
+export const x = 1;
`;

  const violations = checkViolations(parseDiff(diff));
  assert.ok(violations.some((v) => v.rule === 'Edited generated backend.ts file'));
});

test('flags direct tauri invoke without correlation propagation', () => {
  const diff = `diff --git a/frontend/src/domains/tasks/ipc/tasks.ipc.ts b/frontend/src/domains/tasks/ipc/tasks.ipc.ts
index 1111111..2222222 100644
--- a/frontend/src/domains/tasks/ipc/tasks.ipc.ts
+++ b/frontend/src/domains/tasks/ipc/tasks.ipc.ts
@@ -10,1 +10,3 @@
+import { invoke } from '@tauri-apps/api/core';
+const run = () => invoke('x');
`;

  const violations = checkViolations(parseDiff(diff));
  assert.ok(violations.some((v) => v.rule === 'Frontend direct tauri calls'));
  assert.ok(violations.some((v) => v.rule === 'Missing correlation propagation'));
});
