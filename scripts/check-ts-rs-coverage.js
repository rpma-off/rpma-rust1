#!/usr/bin/env node
/**
 * check-ts-rs-coverage.js
 *
 * Verifies ts-rs type export coverage per ADR-015:
 *   T1 — Every type listed in export-types.rs has #[derive(TS)] in its source file
 *   T2 — Types used as #[tauri::command] return values are registered in export-types.rs
 *
 * Exit codes:
 *   0 – all checks passed (warnings may still be printed)
 *   1 – one or more T1 errors found
 *
 * Usage:
 *   node scripts/check-ts-rs-coverage.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────

const ROOT             = path.resolve(__dirname, '..');
const SRC_DIR          = path.join(ROOT, 'src-tauri', 'src');
const EXPORT_TYPES_BIN = path.join(ROOT, 'src-tauri', 'src', 'bin', 'export-types.rs');

// Primitive / standard-library types that never need #[derive(TS)]
const PRIMITIVE_TYPES = new Set([
  'String', 'str', 'bool',
  'i8', 'i16', 'i32', 'i64', 'i128', 'isize',
  'u8', 'u16', 'u32', 'u64', 'u128', 'usize',
  'f32', 'f64',
  'Vec', 'Option', 'Result', 'HashMap', 'HashSet',
  'Value',       // serde_json::Value — intentionally not TS-exported
  'AppError',    // error type, not exported to TS
  'IpcResult',   // wrapper, not a domain type
  'DbResult',    // internal
  'PathBuf', 'Path',
]);

// Types exported in export-types.rs that are known to be re-exports or type
// aliases defined without a standalone #[derive(TS)] attribute in source.
// Add here if a false-positive appears (with a comment explaining why).
const KNOWN_ALLOWLIST = new Set([
  // None currently documented — add if needed.
]);

const errors   = [];
const warnings = [];

function addError(msg)   { errors.push(msg); }
function addWarning(msg) { warnings.push(msg); }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Recursively collect all *.rs files under a directory. */
function collectRustFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectRustFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.rs')) {
      results.push(full);
    }
  }
  return results;
}

// ─── T1: All exported types have #[derive(TS)] ────────────────────────────────

/**
 * Parse export-types.rs and extract all type names called as
 *   TypeName::export_to_string()
 */
function parseExportedTypes(content) {
  const types = new Set();
  for (const m of content.matchAll(/\b(\w+)::export_to_string\(\)/g)) {
    types.add(m[1]);
  }
  return types;
}

/**
 * Scan all .rs source files and collect types that have #[derive(TS)].
 * Also handles:
 *  - #[ts(rename = "AltName")] — registers the type under its TS name
 *  - pub type Alias = ConcreteType — registers the alias if the concrete type is TS-annotated
 *
 * Returns a Map<tsTypeName, filePath> for the first occurrence.
 */
function collectTsAnnotatedTypes(srcDir) {
  const annotated      = new Map(); // rustTypeName → filePath
  const tsRenames      = new Map(); // rustTypeName → tsName
  const typeAliases    = new Map(); // aliasName    → concreteTypeName

  for (const file of collectRustFiles(srcDir)) {
    if (file === EXPORT_TYPES_BIN) continue;

    const content = fs.readFileSync(file, 'utf8');
    const lines   = content.split('\n');
    const relFile = path.relative(ROOT, file);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Collect type aliases: pub type Alias = Concrete;
      const aliasMatch = line.match(/^pub\s+type\s+(\w+)\s*=\s*(\w+)\s*;/);
      if (aliasMatch) {
        typeAliases.set(aliasMatch[1], aliasMatch[2]);
        continue;
      }

      // Collect #[ts(rename = "...")] annotations
      const renameMatch = line.match(/#\[ts\s*\(\s*rename\s*=\s*"(\w+)"/);
      if (renameMatch) {
        // The rename applies to the next struct/enum within a few lines
        for (let j = i + 1; j < Math.min(i + 9, lines.length); j++) {
          const m = lines[j].match(/^(?:pub\s+)?(?:pub\s*\([^)]+\)\s*)?(?:struct|enum)\s+(\w+)/);
          if (m) {
            tsRenames.set(m[1], renameMatch[1]);
            break;
          }
          if (/^(?:impl|fn|mod|use|pub\s+use)\b/.test(lines[j].trim())) break;
        }
      }

      // Collect types with #[derive(TS)]
      if (!/#\[derive\s*\(/.test(line)) continue;
      if (!/\bTS\b/.test(line)) continue;

      for (let j = i + 1; j < Math.min(i + 9, lines.length); j++) {
        const m = lines[j].match(/^(?:pub\s+)?(?:pub\s*\([^)]+\)\s*)?(?:struct|enum)\s+(\w+)/);
        if (m) {
          if (!annotated.has(m[1])) {
            annotated.set(m[1], relFile);
          }
          break;
        }
        if (/^(?:impl|fn|mod|use|pub\s+use)\b/.test(lines[j].trim())) break;
      }
    }
  }

  // Expand: build the final set using TS names (renamed types + aliases)
  const result = new Map(annotated); // start with rust names

  // Add #[ts(rename)] entries: if ClientModel has TS and is renamed to Client, add Client too
  for (const [rustName, tsName] of tsRenames) {
    if (annotated.has(rustName)) {
      result.set(tsName, annotated.get(rustName));
    }
  }

  // Add type alias entries: if Client = ClientModel and ClientModel has TS, add Client too
  for (const [alias, concrete] of typeAliases) {
    if (annotated.has(concrete)) {
      result.set(alias, annotated.get(concrete));
    }
    // Also handle the rename case: alias → renamed type
    const tsName = tsRenames.get(concrete);
    if (tsName && annotated.has(concrete)) {
      result.set(alias, annotated.get(concrete));
    }
  }

  return result;
}

function checkT1(exportedTypes, tsAnnotatedTypes) {
  for (const typeName of exportedTypes) {
    if (KNOWN_ALLOWLIST.has(typeName)) continue;
    if (!tsAnnotatedTypes.has(typeName)) {
      addError(
        `[ADR-015] T1 — Type '${typeName}' is exported in export-types.rs but has no #[derive(TS)] found in source\n` +
        `  → Add #[derive(TS)] to the definition of '${typeName}' in src-tauri/src/`
      );
    }
  }
}

// ─── T2: Command return types are in export-types.rs ─────────────────────────

/**
 * Scan IPC handler files for #[tauri::command] fn return types.
 * Returns Set of custom type names used as return types (unwrapped from Result/IpcResult).
 */
function parseCommandReturnTypes(srcDir) {
  const returnTypes = new Map(); // typeName → filePath

  for (const file of collectRustFiles(srcDir)) {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('#[tauri::command]')) continue;

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes('#[tauri::command]')) continue;

      // Read the function signature (may span multiple lines)
      let sig = '';
      for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
        sig += ' ' + lines[j];
        if (lines[j].includes('{')) break;
      }

      // Extract return type after ->
      const retMatch = sig.match(/->\s*([^{]+)/);
      if (!retMatch) continue;

      const retType = retMatch[1].trim();

      // Unwrap common wrappers: Result<T, _>, IpcResult<T>, CommandResult<T>
      const unwrapped = retType
        .replace(/^(?:Result|IpcResult|CommandResult|impl\s+\S+)\s*<\s*/, '')
        .replace(/\s*,\s*[^>]+>$/, '')
        .replace(/>$/, '')
        .trim();

      // Extract base type name (strip Vec<>, Option<>, etc.)
      const baseMatch = unwrapped.match(/^(?:Vec<|Option<)?([A-Z]\w+)>?$/);
      if (!baseMatch) continue;

      const typeName = baseMatch[1];
      if (PRIMITIVE_TYPES.has(typeName)) continue;
      if (!returnTypes.has(typeName)) {
        returnTypes.set(typeName, path.relative(ROOT, file));
      }
    }
  }

  return returnTypes;
}

function checkT2(commandReturnTypes, exportedTypes) {
  for (const [typeName, file] of commandReturnTypes) {
    if (KNOWN_ALLOWLIST.has(typeName)) continue;
    if (!exportedTypes.has(typeName)) {
      addWarning(
        `[ADR-015] T2 — Type '${typeName}' used as a #[tauri::command] return type but not in export-types.rs\n` +
        `  Found in: ${file}\n` +
        `  → Add ${typeName}::export_to_string() to src-tauri/src/bin/export-types.rs`
      );
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (!fs.existsSync(EXPORT_TYPES_BIN)) {
  console.error(`ERROR: export-types.rs not found at ${EXPORT_TYPES_BIN}`);
  process.exit(1);
}

const exportTypesContent = fs.readFileSync(EXPORT_TYPES_BIN, 'utf8');
const exportedTypes      = parseExportedTypes(exportTypesContent);
const tsAnnotatedTypes   = collectTsAnnotatedTypes(SRC_DIR);
const commandReturnTypes = parseCommandReturnTypes(SRC_DIR);

checkT1(exportedTypes, tsAnnotatedTypes);
checkT2(commandReturnTypes, exportedTypes);

// ─── Report ───────────────────────────────────────────────────────────────────

console.log('\n── ts-rs Coverage Check ────────────────────────────────────');
console.log(`export-types.rs exports: ${exportedTypes.size} types`);
console.log(`Source files with #[derive(TS)]: ${tsAnnotatedTypes.size} types`);
console.log(`#[tauri::command] return types:  ${commandReturnTypes.size} unique types\n`);

if (warnings.length > 0) {
  console.log(`WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log(`  ⚠  ${w}\n`);
}

if (errors.length > 0) {
  console.log(`ERRORS (${errors.length}):`);
  for (const e of errors) console.log(`  ✖  ${e}\n`);
  console.log(`\nts-rs coverage check FAILED with ${errors.length} error(s).`);
  process.exit(1);
}

console.log('ts-rs coverage check PASSED ✓');
process.exit(0);
