#!/usr/bin/env node
/**
 * IPC Consistency Check — RPMA v2
 *
 * Validates that the frontend IPC_COMMANDS registry is consistent with
 * the backend generate_handler! registration in main.rs.
 *
 * Detects:
 *  1. FE-only entries that have no matching backend handler (phantom commands)
 *  2. BE-only commands that have no FE registry entry (missing wrappers)
 *
 * Entries annotated with "@deprecated NOT_IMPLEMENTED" in the FE registry
 * are expected to be FE-only and are reported as warnings, not errors.
 *
 * Exit codes:
 *  0 — all checks pass
 *  1 — consistency errors detected
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MAIN_RS = path.join(ROOT, "src-tauri", "src", "main.rs");
const COMMANDS_TS = path.join(
  ROOT,
  "frontend",
  "src",
  "lib",
  "ipc",
  "commands.ts"
);

// ─── Parse backend commands from main.rs ──────────────────────────
function parseBackendCommands(mainRsContent) {
  const re = /generate_handler!\s*\[(.*?)\]/gs;
  const out = new Set();
  let m;
  while ((m = re.exec(mainRsContent))) {
    const inner = m[1]
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\r\n]*/g, "");
    for (const part of inner.split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const fn = trimmed.split("::").pop();
      if (fn) out.add(fn);
    }
  }
  return out;
}

// ─── Parse frontend IPC_COMMANDS registry ─────────────────────────
function parseFrontendCommands(commandsTsContent) {
  const entries = new Map(); // value -> { key, notImplemented }
  const lines = commandsTsContent.split("\n");

  let prevLineIsNotImplemented = false;
  for (const line of lines) {
    // Detect @deprecated NOT_IMPLEMENTED JSDoc tag on previous line
    if (
      line.includes("@deprecated") &&
      line.includes("NOT_IMPLEMENTED")
    ) {
      prevLineIsNotImplemented = true;
      continue;
    }

    const match = line.match(/^\s*(\w+)\s*:\s*'([a-z0-9_]+)'/);
    if (match) {
      entries.set(match[2], {
        key: match[1],
        notImplemented: prevLineIsNotImplemented,
      });
      prevLineIsNotImplemented = false;
    } else {
      // Reset if line doesn't match a command entry
      if (!line.trim().startsWith("/**") && !line.trim().startsWith("*")) {
        prevLineIsNotImplemented = false;
      }
    }
  }
  return entries;
}

// ─── Main ─────────────────────────────────────────────────────────
function run() {
  if (!fs.existsSync(MAIN_RS)) {
    console.error(`❌ main.rs not found at ${MAIN_RS}`);
    process.exit(1);
  }
  if (!fs.existsSync(COMMANDS_TS)) {
    console.error(`❌ commands.ts not found at ${COMMANDS_TS}`);
    process.exit(1);
  }

  const backendCommands = parseBackendCommands(
    fs.readFileSync(MAIN_RS, "utf8")
  );
  const frontendEntries = parseFrontendCommands(
    fs.readFileSync(COMMANDS_TS, "utf8")
  );
  const frontendCommandValues = new Set(frontendEntries.keys());

  const errors = [];
  const warnings = [];

  // 1. FE-only: in FE registry but not in BE
  for (const [cmd, meta] of frontendEntries) {
    if (!backendCommands.has(cmd)) {
      if (meta.notImplemented) {
        warnings.push(
          `⚠️  FE registry "${meta.key}" → '${cmd}' is NOT_IMPLEMENTED (no backend handler) — acknowledged`
        );
      } else {
        errors.push(
          `❌ FE registry "${meta.key}" → '${cmd}' has NO backend handler in main.rs`
        );
      }
    }
  }

  // 2. BE-only: in BE but not in FE registry
  for (const cmd of backendCommands) {
    if (!frontendCommandValues.has(cmd)) {
      errors.push(
        `❌ Backend command '${cmd}' is NOT in FE IPC_COMMANDS registry`
      );
    }
  }

  // ─── Report ───────────────────────────────────────────────────
  console.log("🔗 IPC CONSISTENCY CHECK\n");
  console.log(`Backend commands (main.rs):  ${backendCommands.size}`);
  console.log(`Frontend entries (commands.ts): ${frontendEntries.size}`);
  console.log("");

  if (warnings.length > 0) {
    console.log(`WARNINGS (${warnings.length}):`);
    for (const w of warnings) console.log(`  ${w}`);
    console.log("");
  }

  if (errors.length > 0) {
    console.log(`ERRORS (${errors.length}):`);
    for (const e of errors) console.log(`  ${e}`);
    console.log("\n❌ IPC CONSISTENCY CHECK: FAIL");
    process.exit(1);
  }

  console.log("✅ IPC CONSISTENCY CHECK: PASS");
  process.exit(0);
}

run();
