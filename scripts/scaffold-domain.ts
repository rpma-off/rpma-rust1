/**
 * Domain Scaffolder Generator — RPMA v2
 *
 * Usage:
 *   npx tsx scripts/scaffold-domain.ts <domain_name> [options]
 *
 * Options:
 *   --crud          Generate full CRUD (create, update, delete) in IPC + API layers
 *   --no-frontend   Skip frontend scaffolding entirely
 *   --no-tests      Skip test file generation
 *   --admin-only    Wrap all IPC handlers with admin-role enforcement
 *   --with-events   Generate DomainEvent variant stub + event_factory stub
 *   --dry-run       Print all files and patches without writing
 *
 * Example:
 *   npx tsx scripts/scaffold-domain.ts invoice --crud
 *   npx tsx scripts/scaffold-domain.ts invoice --admin-only --no-frontend
 */

import fs from "fs/promises";
import path from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DomainNames {
  snake: string;       // invoice_item
  camel: string;       // invoiceItem
  pascal: string;      // InvoiceItem
  kebab: string;       // invoice-item
}

interface ScaffoldOptions {
  crud: boolean;
  noFrontend: boolean;
  noTests: boolean;
  adminOnly: boolean;
  withEvents: boolean;
  dryRun: boolean;
}

interface ScaffoldPaths {
  repoRoot: string;
  backendSrc: string;
  frontendSrc: string;
  domainBackend: string;
  domainFrontend: string;
}

// ─── Name Transformations ─────────────────────────────────────────────────────

export function toSnakeCase(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

export function toCamelCase(s: string): string {
  const snake = toSnakeCase(s);
  return snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function toPascalCase(s: string): string {
  const camel = toCamelCase(s);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

export function toKebabCase(s: string): string {
  return toSnakeCase(s).replace(/_/g, "-");
}

function buildNames(raw: string): DomainNames {
  return {
    snake: toSnakeCase(raw),
    camel: toCamelCase(raw),
    pascal: toPascalCase(raw),
    kebab: toKebabCase(raw),
  };
}

// ─── CLI Parsing ──────────────────────────────────────────────────────────────

function parseArgs(): { domainRaw: string; options: ScaffoldOptions } {
  const args = process.argv.slice(2);
  const domainRaw = args.find((a) => !a.startsWith("--"));
  if (!domainRaw) {
    console.error("Error: domain name is required.");
    console.error("Usage: npx tsx scripts/scaffold-domain.ts <domain_name> [options]");
    process.exit(1);
  }
  return {
    domainRaw,
    options: {
      crud: args.includes("--crud"),
      noFrontend: args.includes("--no-frontend"),
      noTests: args.includes("--no-tests"),
      adminOnly: args.includes("--admin-only"),
      withEvents: args.includes("--with-events"),
      dryRun: args.includes("--dry-run"),
    },
  };
}

// ─── Path Helpers ─────────────────────────────────────────────────────────────

function buildPaths(repoRoot: string, names: DomainNames): ScaffoldPaths {
  return {
    repoRoot,
    backendSrc: path.join(repoRoot, "src-tauri", "src"),
    frontendSrc: path.join(repoRoot, "frontend", "src"),
    domainBackend: path.join(repoRoot, "src-tauri", "src", "domains", names.snake),
    domainFrontend: path.join(repoRoot, "frontend", "src", "domains", names.snake),
  };
}

// ─── Domain Existence Check ───────────────────────────────────────────────────

export async function domainExists(domainBackendPath: string): Promise<boolean> {
  try {
    await fs.access(domainBackendPath);
    return true;
  } catch {
    return false;
  }
}

// ─── File Writer (respects dry-run) ──────────────────────────────────────────

const writtenFiles: string[] = [];
const patchedFiles: string[] = [];

async function writeFile(
  filePath: string,
  content: string,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    console.log(`\n[dry-run] Would write: ${filePath}`);
    console.log("─".repeat(60));
    console.log(content);
    console.log("─".repeat(60));
  } else {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
  }
  writtenFiles.push(filePath);
}

// ─── Idempotent Patch Helper ──────────────────────────────────────────────────

/**
 * Inserts `lineToInsert` into `filePath` immediately before the line that
 * matches `anchorPattern`. If no anchor is given, appends to end of file.
 * Skips the insertion if the exact line already exists.
 */
export async function patchFile(
  filePath: string,
  lineToInsert: string,
  anchorPattern?: RegExp | string,
  dryRun?: boolean
): Promise<void> {
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    console.error(`  [patch] Cannot read ${filePath} — skipping.`);
    return;
  }

  // Idempotency: skip if line already present (exact match on trimmed content)
  const trimmed = lineToInsert.trim();
  if (content.split("\n").some((l) => l.trim() === trimmed)) {
    return; // already there
  }

  let newContent: string;
  if (anchorPattern) {
    const pattern =
      typeof anchorPattern === "string"
        ? new RegExp(anchorPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        : anchorPattern;

    const lines = content.split("\n");
    const idx = lines.findIndex((l) => pattern.test(l));
    if (idx === -1) {
      console.warn(
        `  [patch] Anchor not found in ${filePath}: ${anchorPattern} — appending to end.`
      );
      newContent = content.trimEnd() + "\n" + lineToInsert + "\n";
    } else {
      lines.splice(idx, 0, lineToInsert);
      newContent = lines.join("\n");
    }
  } else {
    newContent = content.trimEnd() + "\n" + lineToInsert + "\n";
  }

  if (dryRun) {
    console.log(`\n[dry-run] Would patch: ${filePath}`);
    console.log(`  + ${lineToInsert}`);
  } else {
    // Backup before patching
    await fs.copyFile(filePath, filePath + ".bak");
    await fs.writeFile(filePath, newContent, "utf-8");
  }

  if (!patchedFiles.includes(filePath)) {
    patchedFiles.push(filePath);
  }
}

// ─── Rust Templates ───────────────────────────────────────────────────────────

function RUST_MOD_TEMPLATE(n: DomainNames): string {
  return `\
mod facade;
pub(crate) use facade::${n.pascal}Facade;
pub(crate) mod application;
#[cfg(feature = "export-types")]
pub mod domain;
#[cfg(not(feature = "export-types"))]
pub(crate) mod domain;
pub(crate) mod infrastructure;
pub(crate) mod ipc;
#[cfg(test)]
pub(crate) mod tests;
`;
}

function RUST_FACADE_TEMPLATE(n: DomainNames): string {
  return `\
//! Cross-domain facade for the \`${n.snake}\` domain (ADR-002, ADR-003).
//!
//! Keep this surface minimal — only expose what other domains truly need.
//! Prefer \`shared/contracts/\` for type-only sharing.

// TODO(scaffold): Add public types or service methods that cross-domain callers need.

/// Facade for the \`${n.pascal}\` domain.
pub struct ${n.pascal}Facade;
`;
}

function RUST_IPC_MOD_TEMPLATE(n: DomainNames, adminOnly: boolean, crud: boolean): string {
  const resolveCtx = adminOnly
    ? `    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);`
    : `    let ctx = resolve_context!(&state, &correlation_id);`;

  const crudHandlers = crud
    ? `
/// Create a new ${n.pascal}.
#[tauri::command]
pub async fn create_${n.snake}(
    payload: Create${n.pascal}Request,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> AppResult<${n.pascal}> {
${resolveCtx}
    let service = ${n.pascal}Service::new(state.db.clone());
    service.create(payload, &ctx).await
}

/// Update an existing ${n.pascal}.
#[tauri::command]
pub async fn update_${n.snake}(
    id: String,
    payload: Update${n.pascal}Request,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> AppResult<${n.pascal}> {
${resolveCtx}
    let service = ${n.pascal}Service::new(state.db.clone());
    service.update(&id, payload, &ctx).await
}

/// Delete a ${n.pascal}.
#[tauri::command]
pub async fn delete_${n.snake}(
    id: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> AppResult<()> {
${resolveCtx}
    let service = ${n.pascal}Service::new(state.db.clone());
    service.delete(&id, &ctx).await
}`
    : "";

  const adminImport = adminOnly
    ? `\nuse crate::shared::contracts::auth::UserRole;`
    : "";

  return `\
//! IPC handlers for the \`${n.snake}\` domain (ADR-018: thin IPC layer).
//!
//! Handlers MUST:
//!   - receive \`correlation_id: Option<String>\`
//!   - call \`resolve_context!\` as the first line
//!   - delegate immediately to the service layer
//!   - contain no business logic

use crate::commands::{AppResult, AppState};
use crate::domains::${n.snake}::application::services::${n.snake}_service::${n.pascal}Service;
use crate::domains::${n.snake}::domain::models::${n.snake}::${n.pascal};
use crate::resolve_context;${adminImport}

/// List all ${n.pascal} records.
#[tauri::command]
pub async fn list_${n.snake}(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> AppResult<Vec<${n.pascal}>> {
${resolveCtx}
    let service = ${n.pascal}Service::new(state.db.clone());
    service.list(&ctx).await
}

/// Get a single ${n.pascal} by ID.
#[tauri::command]
pub async fn get_${n.snake}(
    id: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> AppResult<${n.pascal}> {
${resolveCtx}
    let service = ${n.pascal}Service::new(state.db.clone());
    service.get(&id, &ctx).await
}${crudHandlers}
`;
}

function RUST_APPLICATION_MOD_TEMPLATE(): string {
  return `pub(crate) mod services;\n`;
}

function RUST_APPLICATION_SERVICES_MOD_TEMPLATE(n: DomainNames): string {
  return `pub(crate) mod ${n.snake}_service;\n`;
}

function RUST_SERVICE_TEMPLATE(n: DomainNames, crud: boolean): string {
  const crudMethods = crud
    ? `
    /// Create a new ${n.pascal}.
    pub async fn create(
        &self,
        payload: Create${n.pascal}Request,
        ctx: &RequestContext,
    ) -> AppResult<${n.pascal}> {
        self.repo.create(payload, ctx).await
    }

    /// Update a ${n.pascal}.
    pub async fn update(
        &self,
        id: &str,
        payload: Update${n.pascal}Request,
        ctx: &RequestContext,
    ) -> AppResult<${n.pascal}> {
        self.repo.update(id, payload, ctx).await
    }

    /// Delete a ${n.pascal}.
    pub async fn delete(&self, id: &str, ctx: &RequestContext) -> AppResult<()> {
        self.repo.delete(id, ctx).await
    }`
    : "";

  const crudTypes = crud
    ? `
// TODO(scaffold): Define Create${n.pascal}Request and Update${n.pascal}Request in domain/models/${n.snake}.rs
// and add #[derive(Debug, Clone, Serialize, Deserialize, TS)] + #[ts(export, export_to = ...)]
use crate::domains::${n.snake}::domain::models::${n.snake}::{Create${n.pascal}Request, Update${n.pascal}Request};`
    : "";

  return `\
//! Application service for the \`${n.snake}\` domain.
//!
//! Orchestrates use cases, enforces business rules, and delegates
//! persistence to the infrastructure layer.

use crate::commands::AppResult;
use crate::db::Database;
use crate::domains::${n.snake}::infrastructure::${n.snake}_repository::{${n.pascal}Repository, Sqlite${n.pascal}Repository};
use crate::domains::${n.snake}::domain::models::${n.snake}::${n.pascal};
use crate::shared::context::RequestContext;
use std::sync::Arc;${crudTypes}

/// Service for ${n.pascal} use-cases.
pub struct ${n.pascal}Service {
    repo: Arc<dyn ${n.pascal}Repository>,
}

impl ${n.pascal}Service {
    /// Construct a new \`${n.pascal}Service\`.
    pub fn new(db: Arc<Database>) -> Self {
        let repo = Arc::new(Sqlite${n.pascal}Repository::new(db));
        Self { repo }
    }

    /// List all ${n.pascal} records visible to the caller.
    pub async fn list(&self, ctx: &RequestContext) -> AppResult<Vec<${n.pascal}>> {
        self.repo.list(ctx).await
    }

    /// Fetch a single ${n.pascal} by primary key.
    pub async fn get(&self, id: &str, ctx: &RequestContext) -> AppResult<${n.pascal}> {
        self.repo.get(id, ctx).await
    }${crudMethods}
}
`;
}

function RUST_DOMAIN_MOD_TEMPLATE(): string {
  return `pub(crate) mod models;\n`;
}

function RUST_DOMAIN_MODELS_MOD_TEMPLATE(n: DomainNames): string {
  return `pub(crate) mod ${n.snake};\n`;
}

function RUST_MODEL_TEMPLATE(n: DomainNames, crud: boolean): string {
  const crudStructs = crud
    ? `
/// Request to create a new ${n.pascal} (ADR-018).
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "frontend/src/types/${n.pascal}.ts")]
pub struct Create${n.pascal}Request {
    // TODO(scaffold): Add creation fields
}

/// Request to update an existing ${n.pascal} (ADR-018).
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "frontend/src/types/${n.pascal}.ts")]
pub struct Update${n.pascal}Request {
    // TODO(scaffold): Add updatable fields
}`
    : "";

  return `\
//! Domain model for the \`${n.snake}\` bounded context.
//!
//! This file is free of infrastructure (rusqlite, serde_json) imports.
//! Row-to-domain conversions live in \`infrastructure/${n.snake}_repository\`.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Primary aggregate for the \`${n.snake}\` domain.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "frontend/src/types/${n.pascal}.ts")]
pub struct ${n.pascal} {
    pub id: String,                 // UUID v4
    pub created_at: i64,            // Unix timestamp ms (ADR-012)
    pub updated_at: i64,            // Unix timestamp ms (ADR-012)
    pub deleted_at: Option<i64>,    // soft delete (ADR-011)
    // TODO(scaffold): Add domain-specific fields
}

// TODO(ADR-017): Add ${n.pascal}Created variant to DomainEvent enum
//   → src-tauri/src/shared/services/domain_event.rs
// TODO(ADR-017): Add event_type() match arm for ${n.pascal}Created
// TODO(ADR-017): Add aggregate_id() match arm for ${n.pascal}Created
// TODO(ADR-017): Add ${n.snake}_created() factory function in event_factory module
${crudStructs}
`;
}

function RUST_INFRA_MOD_TEMPLATE(n: DomainNames, crud: boolean): string {
  const crudImports = crud
    ? `\nuse crate::domains::${n.snake}::domain::models::${n.snake}::{Create${n.pascal}Request, Update${n.pascal}Request};`
    : "";

  const crudTraitMethods = crud
    ? `\n    async fn create(&self, payload: Create${n.pascal}Request, ctx: &RequestContext) -> AppResult<${n.pascal}>;\n    async fn update(&self, id: &str, payload: Update${n.pascal}Request, ctx: &RequestContext) -> AppResult<${n.pascal}>;\n    async fn delete(&self, id: &str, ctx: &RequestContext) -> AppResult<()>;`
    : "";

  const crudImplMethods = crud
    ? `

    async fn create(&self, _payload: Create${n.pascal}Request, _ctx: &RequestContext) -> AppResult<${n.pascal}> {
        todo!("Implement Sqlite${n.pascal}Repository::create")
    }

    async fn update(&self, _id: &str, _payload: Update${n.pascal}Request, _ctx: &RequestContext) -> AppResult<${n.pascal}> {
        todo!("Implement Sqlite${n.pascal}Repository::update")
    }

    async fn delete(&self, _id: &str, _ctx: &RequestContext) -> AppResult<()> {
        todo!("Implement Sqlite${n.pascal}Repository::delete")
    }`
    : "";

  return `\
//! Repository implementation for the \`${n.snake}\` domain (ADR-005).

use async_trait::async_trait;
use crate::commands::{AppError, AppResult};
use crate::db::Database;
use crate::domains::${n.snake}::domain::models::${n.snake}::${n.pascal};
use crate::shared::context::RequestContext;
use std::sync::Arc;${crudImports}

#[async_trait]
pub trait ${n.pascal}Repository: Send + Sync {
    async fn list(&self, ctx: &RequestContext) -> AppResult<Vec<${n.pascal}>>;
    async fn get(&self, id: &str, ctx: &RequestContext) -> AppResult<${n.pascal}>;
${crudTraitMethods}
}

/// SQLite implementation of \`${n.pascal}Repository\`.
pub struct Sqlite${n.pascal}Repository {
    db: Arc<Database>,
}

impl Sqlite${n.pascal}Repository {
    /// Create a new \`Sqlite${n.pascal}Repository\`.
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }
}

#[async_trait]
impl ${n.pascal}Repository for Sqlite${n.pascal}Repository {
    async fn list(&self, _ctx: &RequestContext) -> AppResult<Vec<${n.pascal}>> {
        // NOTE: Keep soft-delete filter on every read path.
        let _sql = "SELECT id, created_at, updated_at, deleted_at FROM ${n.snake}s WHERE deleted_at IS NULL";
        Ok(vec![])
    }

    async fn get(&self, _id: &str, _ctx: &RequestContext) -> AppResult<${n.pascal}> {
        // NOTE: Keep soft-delete filter on every read path.
        let _sql = "SELECT id, created_at, updated_at, deleted_at FROM ${n.snake}s WHERE id = ?1 AND deleted_at IS NULL";
        Err(AppError::NotFound("${n.pascal} not found".into()))
    }${crudImplMethods}
}

`;
}

function RUST_INFRA_ROOT_MOD_TEMPLATE(n: DomainNames): string {
  return `pub(crate) mod ${n.snake}_repository;\n`;
}

// ─── Rust Test Templates ──────────────────────────────────────────────────────

function RUST_TESTS_MOD_TEMPLATE(): string {
  return `\
#[cfg(test)]
pub(crate) mod unit;
#[cfg(test)]
pub(crate) mod integration;
#[cfg(test)]
pub(crate) mod permission;
#[cfg(test)]
pub(crate) mod validation;
`;
}

function RUST_TEST_UNIT_TEMPLATE(n: DomainNames): string {
  return `\
//! Unit tests for the \`${n.snake}\` domain.
//!
//! Test pure business logic — no I/O, no DB.
//! Naming: test_<function>_<scenario>_<expected_result>

#[cfg(test)]
mod tests {
    // TODO(scaffold): Add unit tests for ${n.pascal} domain logic
}
`;
}

function RUST_TEST_INTEGRATION_TEMPLATE(n: DomainNames): string {
  return `\
//! Integration tests for the \`${n.snake}\` domain.
//!
//! Use the shared test harness — never instantiate a raw database directly.
//! See CLAUDE.md: Test Harness — Usage rules.

#[cfg(test)]
mod tests {
    // use crate::tests::harness::TestApp;

    // TODO(scaffold): Add integration tests
    // #[tokio::test]
    // async fn test_list_${n.snake}_success() {
    //     let app = TestApp::seeded().await;
    //     let ctx = app.admin_ctx();
    //     let service = ${n.pascal}Service::new(app.db.clone());
    //     let result = service.list(&ctx).await;
    //     assert!(result.is_ok());
    // }
}
`;
}

function RUST_TEST_PERMISSION_TEMPLATE(n: DomainNames): string {
  return `\
//! RBAC / permission tests for the \`${n.snake}\` domain (ADR-006).
//!
//! Every IPC command must have: authorized success + unauthorized failure per role.

#[cfg(test)]
mod tests {
    // TODO(scaffold): Add permission tests for ${n.pascal} commands
}
`;
}

function RUST_TEST_VALIDATION_TEMPLATE(n: DomainNames): string {
  return `\
//! Validation tests for the \`${n.snake}\` domain.
//!
//! Target the application layer directly with invalid inputs — never through IPC.
//! Cover: empty fields, type violations, business-rule violations.

#[cfg(test)]
mod tests {
    // TODO(scaffold): Add validation tests for ${n.pascal} inputs
}
`;
}

// ─── Frontend Templates ───────────────────────────────────────────────────────

function TS_IPC_TEMPLATE(n: DomainNames, crud: boolean): string {
  const crudMethods = crud
    ? `
  async create(payload: Create${n.pascal}Request): Promise<${n.pascal}> {
    return safeInvoke<${n.pascal}>("create_${n.snake}", { payload });
  },

  async update(id: string, payload: Update${n.pascal}Request): Promise<${n.pascal}> {
    return safeInvoke<${n.pascal}>("update_${n.snake}", { id, payload });
  },

  async delete(id: string): Promise<void> {
    return safeInvoke<void>("delete_${n.snake}", { id });
  },`
    : "";

  const crudImports = crud
    ? `\nimport type { Create${n.pascal}Request, Update${n.pascal}Request } from "@/types/${n.pascal}";`
    : "";

  return `\
import { safeInvoke } from "@/lib/ipc/core";
import type { ${n.pascal} } from "@/types/${n.pascal}";${crudImports}

export const raw${n.pascal}Ipc = {
  async list(): Promise<${n.pascal}[]> {
    return safeInvoke<${n.pascal}[]>("list_${n.snake}", {});
  },

  async get(id: string): Promise<${n.pascal}> {
    return safeInvoke<${n.pascal}>("get_${n.snake}", { id });
  },${crudMethods}
};
`;
}

function TS_IPC_INDEX_TEMPLATE(n: DomainNames): string {
  return `\
import { raw${n.pascal}Ipc } from "./${n.snake}.ipc";

export const ${n.camel}Ipc: typeof raw${n.pascal}Ipc = raw${n.pascal}Ipc;
`;
}

function TS_API_KEYS_TEMPLATE(n: DomainNames): string {
  return `\
export const ${n.camel}Keys = {
  all: ["${n.snake}"] as const,
  lists: () => [...${n.camel}Keys.all, "list"] as const,
  detail: (id: string) => [...${n.camel}Keys.all, "detail", id] as const,
};
`;
}

function TS_API_TEMPLATE(n: DomainNames, crud: boolean): string {
  const crudHooks = crud
    ? `
export function useCreate${n.pascal}() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Create${n.pascal}Request) => ${n.camel}Ipc.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ${n.camel}Keys.lists() }),
  });
}

export function useUpdate${n.pascal}() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Update${n.pascal}Request }) =>
      ${n.camel}Ipc.update(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ${n.camel}Keys.detail(id) });
      qc.invalidateQueries({ queryKey: ${n.camel}Keys.lists() });
    },
  });
}

export function useDelete${n.pascal}() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ${n.camel}Ipc.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ${n.camel}Keys.lists() }),
  });
}

export const useCreate = useCreate${n.pascal};`
    : "";

  const crudImports = crud
    ? `\nimport type { Create${n.pascal}Request, Update${n.pascal}Request } from "@/types/${n.pascal}";`
    : "";

  const crudUseImports = crud ? ", useMutation, useQueryClient" : "";

  return `\
/**
 * ${n.pascal} domain — TanStack Query hooks (ADR-014).
 *
 * Server state only. Zustand is for UI state, not server cache.
 */
import { useQuery${crudUseImports} } from "@tanstack/react-query";
import { ${n.camel}Ipc } from "../ipc";${crudImports}
import { ${n.camel}Keys } from "./keys";
export { ${n.camel}Keys } from "./keys";

// ── Queries ───────────────────────────────────────────────────────────────────

export function use${n.pascal}List() {
  return useQuery({
    queryKey: ${n.camel}Keys.lists(),
    queryFn: () => ${n.camel}Ipc.list(),
  });
}

export function use${n.pascal}(id: string) {
  return useQuery({
    queryKey: ${n.camel}Keys.detail(id),
    queryFn: () => ${n.camel}Ipc.get(id),
    enabled: !!id,
  });
}
export const useList = use${n.pascal}List;
${crudHooks}
`;
}

function TS_HOOKS_TEMPLATE(n: DomainNames): string {
  return `\
/**
 * ${n.pascal} domain — UI hooks.
 *
 * Place domain-specific, presentation-side hooks here.
 * Query state lives in api/index.ts (TanStack Query).
 */

// TODO(scaffold): Add ${n.pascal}-specific UI hooks as needed.

export {};
`;
}

function TS_COMPONENT_TEMPLATE(n: DomainNames): string {
  return `\
/**
 * ${n.pascal}List — presentational component (ADR-013).
 *
 * Receives data via props; does not fetch directly.
 * Connect to server state via use${n.pascal}List() in a parent container.
 */
import type { ${n.pascal} } from "@/types/${n.pascal}";

interface ${n.pascal}ListProps {
  items: ${n.pascal}[];
  isLoading?: boolean;
}

export function ${n.pascal}List({ items, isLoading }: ${n.pascal}ListProps) {
  if (isLoading) return <div>Loading…</div>;
  if (!items.length) return <div>No ${n.snake.replace(/_/g, " ")}s found.</div>;

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.id}</li>
      ))}
    </ul>
  );
}
`;
}

function TS_PAGE_HOOK_TEMPLATE(n: DomainNames): string {
  return `\
import { useState } from 'react';
import { use${n.pascal}List } from '../api';

/**
 * Page-level hook for ${n.pascal} domain logic.
 * Encapsulates search, filtering, and navigation logic.
 */
export function use${n.pascal}Page() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: items = [], isLoading } = use${n.pascal}List();

  const filteredItems = items.filter(item =>
    // TODO: Implement real search logic
    item.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    // TODO: Navigate to creation page
    console.log("Create ${n.pascal} clicked");
  };

  return {
    items: filteredItems,
    isLoading,
    searchQuery,
    setSearchQuery,
    totalCount: items.length,
    handleCreate,
  };
}
`;
}

function TS_DOMAIN_INDEX_TEMPLATE(n: DomainNames): string {
  return `\
export * from "./api";
export * from "./ipc";
export * from "./hooks";
export { ${n.pascal}List } from "./components/${n.pascal}List";
export { use${n.pascal}Page } from "./hooks/use${n.pascal}Page";
`;
}

function TS_DOMAIN_TEST_TEMPLATE(n: DomainNames): string {
  return `\
/**
 * Scaffolded frontend tests for the \`${n.snake}\` domain.
 */
import { describe, expect, it } from '@jest/globals';

describe("${n.pascal} domain scaffold", () => {
  it("has a test stub", () => {
    expect(true).toBe(true);
  });
});
`;
}

function TS_APP_PAGE_TEMPLATE(n: DomainNames): string {
  return `\
"use client";

import { Plus, Search, FileText } from "lucide-react";
import { PageShell } from "@/shared/ui/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { FadeIn } from "@/shared/ui/animations/FadeIn";
import { ${n.pascal}List, use${n.pascal}Page } from "@/domains/${n.snake}";

/**
 * Route page for ${n.pascal} domain.
 * ADR-013: Orchestrates data fetching, search, and layout.
 */
export default function ${n.pascal}Page() {
  const {
    items,
    isLoading,
    searchQuery,
    setSearchQuery,
    totalCount,
    handleCreate,
  } = use${n.pascal}Page();

  return (
    <PageShell>
      <FadeIn>
        <PageHeader
          title="${n.pascal} Management"
          subtitle={\`\${totalCount} total items\`}
          actions={
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New ${n.pascal}
            </Button>
          }
        />

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search ${n.snake.replace(/_/g, " ")}s..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {items.length === 0 && !isLoading ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No ${n.snake.replace(/_/g, " ")}s found"
            description="Get started by creating your first ${n.snake.replace(/_/g, " ")}."
            action={{
              label: 'Create ${n.pascal}',
              onClick: handleCreate,
              icon: <Plus className="h-4 w-4" />,
            }}
          />
        ) : (
          <${n.pascal}List items={items} isLoading={isLoading} />
        )}
      </FadeIn>
    </PageShell>
  );
}
`;
}

// ─── Backend File Generation ──────────────────────────────────────────────────

export async function generateBackendFiles(
  n: DomainNames,
  p: ScaffoldPaths,
  opts: ScaffoldOptions
): Promise<void> {
  const base = p.domainBackend;

  await writeFile(path.join(base, "mod.rs"), RUST_MOD_TEMPLATE(n), opts.dryRun);
  await writeFile(path.join(base, "facade.rs"), RUST_FACADE_TEMPLATE(n), opts.dryRun);

  // ipc/
  await writeFile(
    path.join(base, "ipc", "mod.rs"),
    RUST_IPC_MOD_TEMPLATE(n, opts.adminOnly, opts.crud),
    opts.dryRun
  );

  // application/
  await writeFile(
    path.join(base, "application", "mod.rs"),
    RUST_APPLICATION_MOD_TEMPLATE(),
    opts.dryRun
  );
  await writeFile(
    path.join(base, "application", "services", "mod.rs"),
    RUST_APPLICATION_SERVICES_MOD_TEMPLATE(n),
    opts.dryRun
  );
  await writeFile(
    path.join(base, "application", "services", `${n.snake}_service.rs`),
    RUST_SERVICE_TEMPLATE(n, opts.crud),
    opts.dryRun
  );

  // domain/
  await writeFile(
    path.join(base, "domain", "mod.rs"),
    RUST_DOMAIN_MOD_TEMPLATE(),
    opts.dryRun
  );
  await writeFile(
    path.join(base, "domain", "models", "mod.rs"),
    RUST_DOMAIN_MODELS_MOD_TEMPLATE(n),
    opts.dryRun
  );
  await writeFile(
    path.join(base, "domain", "models", `${n.snake}.rs`),
    RUST_MODEL_TEMPLATE(n, opts.crud),
    opts.dryRun
  );

  // infrastructure/
  await writeFile(
    path.join(base, "infrastructure", "mod.rs"),
    RUST_INFRA_ROOT_MOD_TEMPLATE(n),
    opts.dryRun
  );
  await writeFile(
    path.join(base, "infrastructure", `${n.snake}_repository`, "mod.rs"),
    RUST_INFRA_MOD_TEMPLATE(n, opts.crud),
    opts.dryRun
  );

  // tests/
  if (!opts.noTests) {
    await writeFile(
      path.join(base, "tests", "mod.rs"),
      RUST_TESTS_MOD_TEMPLATE(),
      opts.dryRun
    );
    await writeFile(
      path.join(base, "tests", "unit.rs"),
      RUST_TEST_UNIT_TEMPLATE(n),
      opts.dryRun
    );
    await writeFile(
      path.join(base, "tests", "integration.rs"),
      RUST_TEST_INTEGRATION_TEMPLATE(n),
      opts.dryRun
    );
    await writeFile(
      path.join(base, "tests", "permission.rs"),
      RUST_TEST_PERMISSION_TEMPLATE(n),
      opts.dryRun
    );
    await writeFile(
      path.join(base, "tests", "validation.rs"),
      RUST_TEST_VALIDATION_TEMPLATE(n),
      opts.dryRun
    );
  }
}

// ─── Frontend File Generation ─────────────────────────────────────────────────

export async function generateFrontendFiles(
  n: DomainNames,
  p: ScaffoldPaths,
  opts: ScaffoldOptions
): Promise<void> {
  const base = p.domainFrontend;

  await writeFile(
    path.join(base, "ipc", `${n.snake}.ipc.ts`),
    TS_IPC_TEMPLATE(n, opts.crud),
    opts.dryRun
  );
  await writeFile(
    path.join(base, "ipc", "index.ts"),
    TS_IPC_INDEX_TEMPLATE(n),
    opts.dryRun
  );
  await writeFile(
    path.join(base, "api", "keys.ts"),
    TS_API_KEYS_TEMPLATE(n),
    opts.dryRun
  );
  await writeFile(
    path.join(base, "api", "index.ts"),
    TS_API_TEMPLATE(n, opts.crud),
    opts.dryRun
  );
  await writeFile(
    path.join(base, "hooks", "index.ts"),
    TS_HOOKS_TEMPLATE(n),
    opts.dryRun
  );
  await writeFile(
    path.join(base, "hooks", `use${n.pascal}Page.ts`),
    TS_PAGE_HOOK_TEMPLATE(n),
    opts.dryRun
  );
  await writeFile(
    path.join(base, "components", `${n.pascal}List.tsx`),
    TS_COMPONENT_TEMPLATE(n),
    opts.dryRun
  );
  await writeFile(
    path.join(base, "index.ts"),
    TS_DOMAIN_INDEX_TEMPLATE(n),
    opts.dryRun
  );
  await writeFile(
    path.join(base, "tests", `${n.snake}.scaffold.test.ts`),
    TS_DOMAIN_TEST_TEMPLATE(n),
    opts.dryRun
  );

  // App Route (ADR-013)
  const appRoutePath = path.join(p.repoRoot, "frontend", "src", "app", n.kebab, "page.tsx");
  await writeFile(appRoutePath, TS_APP_PAGE_TEMPLATE(n), opts.dryRun);
}

// ─── Patch Existing Files ─────────────────────────────────────────────────────

async function applyPatches(
  n: DomainNames,
  p: ScaffoldPaths,
  opts: ScaffoldOptions
): Promise<void> {
  // 1 — Register domain module in domains/mod.rs
  const domainsModPath = path.join(p.backendSrc, "domains", "mod.rs");
  await patchFile(
    domainsModPath,
    `pub mod ${n.snake};`,
    // Insert before the closing blank line / end of file — append strategy
    undefined,
    opts.dryRun
  );

  // 2 — Register service in service_builder.rs (DOCUMENTED arrays + TODO stub)
  const serviceBuilderPath = path.join(p.backendSrc, "service_builder.rs");

  // Add to DOCUMENTED_SERVICE_INIT_ORDER (anchor: last real entry "QuoteConvertedHandler")
  await patchFile(
    serviceBuilderPath,
    `    // TODO(scaffold): "${n.pascal}Service",   // ← insert at correct LAYER position`,
    /QuoteConvertedHandler",$/,
    opts.dryRun
  );

  // Add to DOCUMENTED_SERVICE_DEPENDENCIES (anchor: QuoteConvertedHandler tuple)
  await patchFile(
    serviceBuilderPath,
    `    // TODO(scaffold): ("${n.pascal}Service", &["Database"]),   // ← wire real deps`,
    /QuoteConvertedHandler.*InterventionWorkflowService.*EventBus/,
    opts.dryRun
  );

  // Add service construction stub in build()
  await patchFile(
    serviceBuilderPath,
    `        // TODO(scaffold): Build ${n.pascal}Service at the correct LAYER:\n        // let ${n.snake}_service = Arc::new(\n        //     crate::domains::${n.snake}::application::services::${n.snake}_service::${n.pascal}Service::new(self.db.clone()),\n        // );`,
    // Anchor: the "Build and return AppStateType" comment
    /Build and return AppStateType/,
    opts.dryRun
  );

  // 3 — Register IPC commands in main.rs invoke_handler
  const mainRsPath = path.join(p.backendSrc, "main.rs");
  // Find the correct alphabetical location — look for a domain that comes after ours
  // Fallback: append before the closing ]); of generate_handler!
  await patchFile(
    mainRsPath,
    `            // ── ${n.pascal} ──────────────────────────────────────────────────────────────\n            domains::${n.snake}::ipc::list_${n.snake},\n            domains::${n.snake}::ipc::get_${n.snake},`,
    // Anchor: the closing ]); of the invoke_handler block
    /^\s*\]\s*\)/,
    opts.dryRun
  );

  // 4 — Register domain in ipcClient (frontend/src/lib/ipc/client.ts)
  if (!opts.noFrontend) {
    const ipcClientPath = path.join(
      p.frontendSrc,
      "lib",
      "ipc",
      "client.ts"
    );

    // Add import with the other domain imports (before the re-export line)
    await patchFile(
      ipcClientPath,
      `import { ${n.camel}Ipc } from "@/domains/${n.snake}/ipc";`,
      // Anchor: the re-export line that separates imports from the const definition
      /^export \* from '\.\/types'/,
      opts.dryRun
    );

    // Add entry in ipcClient object
    await patchFile(
      ipcClientPath,
      `  ${n.snake}: ${n.camel}Ipc,`,
      // Anchor: closing "} as const" of ipcClient
      /^\} as const/,
      opts.dryRun
    );
  }

  // 5 — Crossdomain re-export stub (ADR-003)
  const crossdomainPath = path.join(
    p.backendSrc,
    "shared",
    "services",
    "cross_domain.rs"
  );
  await patchFile(
    crossdomainPath,
    `\n// TODO(scaffold): Uncomment if ${n.pascal}Service needs cross-domain access (ADR-003)\n// pub use crate::domains::${n.snake}::application::services::${n.snake}_service::${n.pascal}Service;`,
    undefined,
    opts.dryRun
  );
}

// ─── Post-Scaffold Checklist ──────────────────────────────────────────────────

export function printChecklist(n: DomainNames, opts: ScaffoldOptions): void {
  const pascal = n.pascal;
  const snake = n.snake;

  console.log();
  console.log("━".repeat(60));
  console.log("  Manual steps required (ADR compliance checklist):");
  console.log("━".repeat(60));
  console.log();

  if (!opts.withEvents) {
    console.log(`  [ ] ADR-017: Add ${pascal}Created variant to DomainEvent enum`);
    console.log(`               → src-tauri/src/shared/services/domain_event.rs`);
    console.log();
    console.log(`  [ ] ADR-017: Add event_type() and aggregate_id() match arms`);
    console.log(`               → same file, impl DomainEvent block`);
    console.log();
    console.log(`  [ ] ADR-017: Add ${snake}_created() factory function`);
    console.log(`               → src-tauri/src/shared/services/event_bus.rs (event_factory module)`);
    console.log();
  }

  console.log(`  [ ] ADR-016: Register AuditLogHandler interest for ${pascal}Created (if auditable)`);
  console.log(`               → src-tauri/src/service_builder.rs (handler registration block)`);
  console.log();

  console.log(`  [ ] ADR-004: Verify LAYER placement and wire service deps in service_builder.rs`);
  console.log(`               → Search TODO(scaffold) comments added by this script`);
  console.log(`               → Also update DOCUMENTED_SERVICE_INIT_ORDER and DOCUMENTED_SERVICE_DEPENDENCIES`);
  console.log();

  console.log(`  [ ] ADR-010: Add a migration SQL file if the domain requires a table`);
  console.log(`               → src-tauri/migrations/<next_number>_create_${snake}s.sql`);
  console.log();

  console.log(`  [ ] ADR-015: Run npm run types:sync to regenerate TypeScript types`);
  console.log(`               → Required after any Rust struct with #[derive(TS)] is changed`);
  console.log();

  console.log(`  [ ] ADR-003: If ${pascal}Service needs cross-domain access, uncomment stub`);
  console.log(`               → src-tauri/src/shared/services/cross_domain.rs`);
  console.log();

  if (!opts.noFrontend) {
    console.log(`  [ ] ADR-013: Verify ${n.camel}Ipc is correctly wired in frontend/src/lib/ipc/client.ts`);
    console.log();
  }

  console.log(`  [ ] Run: cd src-tauri && cargo check`);
  console.log(`               → Verify the scaffolded Rust code compiles`);
  console.log();

  if (!opts.noFrontend) {
    console.log(`  [ ] Run: npm run frontend:type-check`);
    console.log(`               → Verify the scaffolded TypeScript compiles`);
    console.log();
  }
}

// ─── Summary Output ───────────────────────────────────────────────────────────

function printSummary(n: DomainNames, opts: ScaffoldOptions): void {
  const prefix = opts.dryRun ? "[dry-run] " : "";

  console.log();
  console.log(`✔ Domain ${opts.dryRun ? "would be created" : "created"}: ${n.snake}`);
  console.log(`✔ ${prefix}Backend files generated:`);
  for (const f of writtenFiles.filter((f) => f.includes("src-tauri"))) {
    console.log(`    ${f}`);
  }
  if (!opts.noFrontend) {
    console.log(`✔ ${prefix}Frontend files generated:`);
    for (const f of writtenFiles.filter((f) => f.includes("frontend"))) {
      console.log(`    ${f}`);
    }
  }
  if (patchedFiles.length > 0) {
    console.log(`✔ ${prefix}Patches applied:`);
    for (const f of patchedFiles) {
      console.log(`    ${f}`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { domainRaw, options } = parseArgs();
  const n = buildNames(domainRaw);

  // Repo root is the working directory — always run this script from the repo root.
  const repoRoot = path.resolve(process.cwd());
  const p = buildPaths(repoRoot, n);

  console.log(`\nRPMA Domain Scaffolder — domain: ${n.snake}`);
  if (options.dryRun) console.log("(dry-run mode — no files will be written)\n");

  // Safety: abort if domain already exists
  if (!options.dryRun && (await domainExists(p.domainBackend))) {
    console.error(
      `Error: Domain "${n.snake}" already exists at:\n  ${p.domainBackend}\nAbort.`
    );
    process.exit(1);
  }

  await generateBackendFiles(n, p, options);

  if (!options.noFrontend) {
    await generateFrontendFiles(n, p, options);
  }

  await applyPatches(n, p, options);

  printSummary(n, options);
  printChecklist(n, options);
}

main().catch((err) => {
  console.error("Scaffold failed:", err);
  process.exit(1);
});
