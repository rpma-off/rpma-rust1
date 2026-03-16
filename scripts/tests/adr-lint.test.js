const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT_JS = path.join(REPO_ROOT, 'scripts', 'adr-lint.js');
const STALE_OFFSET_MS = 5_000;
const NEWER_MTIME_OFFSET_MS = 10_000;

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, `command failed: ${command} ${args.join(' ')}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
}

function initFixture(name) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
  run('git', ['init'], fixture);
  run('git', ['config', 'user.email', 'ci@example.com'], fixture);
  run('git', ['config', 'user.name', 'CI'], fixture);
  return fixture;
}

function stageAll(fixture) {
  run('git', ['add', '.'], fixture);
}

function runAdrLint(rootDir) {
  return spawnSync('node', [SCRIPT_JS, '--root', rootDir, '--staged'], {
    encoding: 'utf8',
  });
}

test('adr-lint passes for compliant staged files', () => {
  const fixture = initFixture('adr-lint-pass');

  write(
    path.join(fixture, 'src-tauri', 'src', 'domains', 'tasks', 'ipc', 'task.rs'),
    [
      'use crate::resolve_context;',
      '',
      '#[tauri::command]',
      'pub async fn list_tasks(state: AppState<\'_>, correlation_id: Option<String>) {',
      '    let _ctx = resolve_context!(&state, &correlation_id);',
      '}',
      '',
    ].join('\n'),
  );

  write(
    path.join(fixture, 'frontend', 'src', 'domains', 'tasks', 'api', 'useTasks.ts'),
    [
      'export function useTasks() {',
      '  return [];',
      '}',
      '',
    ].join('\n'),
  );

  const stampFile = path.join(fixture, '.git', 'types-sync-stamp');
  fs.writeFileSync(stampFile, `${Date.now()}\n`, 'utf8');

  stageAll(fixture);

  const result = runAdrLint(fixture);
  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stdout, /ADR lint \(staged mode\)/);
  assert.match(result.stdout, /ADR-019: no unwrap\(\)\/expect\(\) outside test-only Rust code/);
});

test('adr-lint reports ADR-001, ADR-013, and ADR-014 violations', () => {
  const fixture = initFixture('adr-lint-frontend');

  write(
    path.join(fixture, 'src-tauri', 'src', 'domains', 'users', 'ipc', 'user.rs'),
    [
      '#[tauri::command]',
      'pub async fn list_users() {}',
      '',
    ].join('\n'),
  );

  write(
    path.join(fixture, 'frontend', 'src', 'domains', 'users', 'ipc', 'user.ipc.ts'),
    [
      'import { invoke } from "@tauri-apps/api/core";',
      '',
      'export async function listUsers() {',
      '  return invoke("list_users");',
      '}',
      '',
    ].join('\n'),
  );

  write(
    path.join(fixture, 'frontend', 'src', 'domains', 'users', 'hooks', 'useUsers.ts'),
    [
      'import { useEffect, useState } from "react";',
      'import { userIpc as ipc } from "../ipc/user.ipc";',
      '',
      'export function useUsers() {',
      '  const [users, setUsers] = useState([]);',
      '  useEffect(() => {',
      '    void ipc.listUsers().then(setUsers);',
      '  }, []);',
      '  return users;',
      '}',
      '',
    ].join('\n'),
  );

  stageAll(fixture);

  const result = runAdrLint(fixture);
  assert.equal(result.status, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stdout, /ADR-001 violations: 1/);
  assert.match(result.stdout, /ADR-013 violations: 1/);
  assert.match(result.stdout, /ADR-014 heuristic violations: 1/);
});

test('adr-lint reports ADR-019 and ADR-015 violations while ignoring cfg(test) unwraps', () => {
  const fixture = initFixture('adr-lint-rust');

  write(
    path.join(fixture, 'src-tauri', 'src', 'shared', 'panic.rs'),
    [
      'pub fn read_value(value: Option<String>) -> String {',
      '  value.expect("value should exist")',
      '}',
      '',
      '#[cfg(test)]',
      'mod tests {',
      '  #[test]',
      '  fn allows_unwrap_in_tests() {',
      '    let _ = Some("ok").unwrap();',
      '  }',
      '}',
      '',
    ].join('\n'),
  );

  write(
    path.join(fixture, 'frontend', 'src', 'types', 'Task.ts'),
    [
      '// generated',
      'export interface Task {',
      '  id: string;',
      '}',
      '',
    ].join('\n'),
  );

  const staleStamp = Date.now() - STALE_OFFSET_MS;
  fs.writeFileSync(path.join(fixture, '.git', 'types-sync-stamp'), `${staleStamp}\n`, 'utf8');
  fs.utimesSync(
    path.join(fixture, 'frontend', 'src', 'types', 'Task.ts'),
    new Date(),
    new Date(staleStamp + NEWER_MTIME_OFFSET_MS),
  );

  stageAll(fixture);

  const result = runAdrLint(fixture);
  assert.equal(result.status, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stdout, /ADR-019 violations: 1/);
  assert.match(result.stdout, /shared\/panic\.rs:2/);
  assert.doesNotMatch(result.stdout, /allows_unwrap_in_tests/);
  assert.match(result.stdout, /ADR-015 violations: 1/);
});
