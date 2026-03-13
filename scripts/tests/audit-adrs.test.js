const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT_TS = path.join(REPO_ROOT, 'scripts', 'audit-adrs.ts');

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function runAudit(rootDir) {
  const tempScript = path.join(rootDir, 'audit-adrs.js');
  fs.copyFileSync(SCRIPT_TS, tempScript);

  return spawnSync('node', [tempScript, '--root', rootDir], {
    encoding: 'utf8',
  });
}

test('audit-adrs succeeds when references exist and files include ADR comment', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-adrs-pass-'));

  write(
    path.join(fixture, 'docs', 'adr', '018-tauri-command-handlers.md'),
    [
      '# ADR-018',
      '',
      '## Related Files',
      '',
      '- `src-tauri/src/domains/*/ipc/` — handlers',
      '',
    ].join('\n'),
  );

  write(
    path.join(fixture, 'src-tauri', 'src', 'domains', 'tasks', 'ipc', 'task.rs'),
    [
      '/// ADR-018: Thin IPC layer',
      '#[tauri::command]',
      'pub async fn do_task() {}',
      '',
    ].join('\n'),
  );

  const result = runAudit(fixture);
  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stdout, /No stale file references found/i);
});

test('audit-adrs reports stale and undocumented pattern matches', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-adrs-fail-'));

  write(
    path.join(fixture, 'docs', 'adr', '005-repository-pattern.md'),
    [
      '# ADR-005',
      '',
      '## Related Files',
      '',
      '- `src-tauri/src/domains/*/infrastructure/*_repository.rs` - repositories',
      '- `src-tauri/src/missing.rs` - stale',
      '',
    ].join('\n'),
  );

  write(
    path.join(fixture, 'src-tauri', 'src', 'domains', 'tasks', 'infrastructure', 'task_repository.rs'),
    [
      'pub struct TaskRepository;',
      '',
    ].join('\n'),
  );

  const result = runAudit(fixture);
  assert.equal(result.status, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stdout, /Stale file references:/);
  assert.match(result.stdout, /Undocumented pattern matches:/);
});
