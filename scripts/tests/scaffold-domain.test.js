const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts', 'scaffold-domain.ts');
const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

test('scaffold-domain templates include required 4-layer backend elements', () => {
  assert.match(script, /function RUST_IPC_MOD_TEMPLATE/);
  assert.match(script, /use crate::commands::\{AppResult, AppState\};/);
  assert.match(script, /resolve_context!/);
  assert.match(script, /service\.list\(&ctx\)\.await/);

  assert.match(script, /pub struct \$\{n\.pascal\}Service \{\n\s+repo: Arc<dyn \$\{n\.pascal\}Repository>,/);
  assert.match(script, /pub async fn create\(/);
  assert.match(script, /pub async fn list\(/);
  assert.match(script, /pub async fn get\(/);
  assert.match(script, /pub async fn delete/);
  assert.match(script, /ctx: &RequestContext/);

  assert.match(script, /pub id: String/);
  assert.match(script, /pub created_at: i64/);
  assert.match(script, /pub updated_at: i64/);
  assert.match(script, /pub deleted_at: Option<i64>/);

  assert.match(script, /function RUST_INFRA_MOD_TEMPLATE\(n: DomainNames, crud: boolean\)/);
  assert.match(script, /pub trait \$\{n\.pascal\}Repository: Send \+ Sync/);
  assert.match(script, /pub struct Sqlite\$\{n\.pascal\}Repository/);
  assert.match(script, /WHERE deleted_at IS NULL/);
  assert.match(script, /AND deleted_at IS NULL/);

  assert.match(script, /path\.join\(base, "tests", "unit\.rs"\)/);
  assert.match(script, /path\.join\(base, "tests", "integration\.rs"\)/);
  assert.match(script, /path\.join\(base, "tests", "permission\.rs"\)/);
});

test('scaffold-domain templates include required frontend scaffold elements', () => {
  assert.match(script, /path\.join\(base, "api", "keys\.ts"\)/);
  assert.match(script, /path\.join\(base, "api", "index\.ts"\)/);
  assert.match(script, /path\.join\(base, "ipc", "index\.ts"\)/);
  assert.match(script, /path\.join\(base, "tests", `\$\{n\.snake\}\.scaffold\.test\.ts`\)/);
  assert.match(script, /export const useList = use\$\{n\.pascal\}List;/);
  assert.match(script, /export const useCreate = useCreate\$\{n\.pascal\};/);
});
