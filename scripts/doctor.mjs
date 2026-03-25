#!/usr/bin/env node
/**
 * doctor.mjs
 *
 * RPMA Doctor - Comprehensive health check for the project.
 * Designed for both human developers and AI agents.
 *
 * Usage:
 *   npm run doctor           # Fast checks (default)
 *   npm run doctor -- --fix  # Auto-fix fixable issues
 *   npm run doctor -- --full # Include slow checks (tests)
 *   npm run doctor -- --json # Force JSON output
 *
 * Exit codes:
 *   0 - all checks passed
 *   1 - one or more failures
 *   2 - warnings only (no failures, but some non-critical issues)
 *
 * Output format:
 *   - TTY: Human-readable pretty output
 *   - Non-TTY or --json: JSON output for programmatic consumption
 */

import { spawn, execSync } from "child_process";
import { existsSync, statSync, readdirSync, readFileSync } from "fs";
import { resolve, join, relative } from "path";
import { platform } from "os";

const ROOT = resolve(import.meta.dirname, "..");
const C = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

const args = process.argv.slice(2);
const FLAGS = {
  json: args.includes("--json"),
  fix: args.includes("--fix"),
  full: args.includes("--full"),
  parallel: !args.includes("--serial"),
  quick: args.includes("--quick"),
};

const isTTY = process.stdout.isTTY;
const outputJson = FLAGS.json || !isTTY;

function log(...parts) {
  if (!outputJson) {
    console.log(...parts);
  }
}

function logProgress(...parts) {
  if (outputJson) {
    console.error(...parts);
  } else {
    console.log(...parts);
  }
}

function logJson(data) {
  if (!outputJson) return;
  console.log(JSON.stringify(data, null, 2));
}

const results = {
  version: "1.0",
  timestamp: new Date().toISOString(),
  status: "pass",
  exit_code: 0,
  duration_ms: 0,
  environment: {
    node_version: process.version,
    platform: platform(),
  },
  checks: [],
  fixable_checks: [],
  summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
};

function getRustVersion() {
  try {
    const out = execSync("rustc --version", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    });
    const m = out.match(/rustc\s+([\d.]+)/);
    return m ? m[1] : "unknown";
  } catch {
    return "not_installed";
  }
}
results.environment.rust_version = getRustVersion();

function runCommand(cmd, argsArr, opts = {}) {
  return new Promise((resolvePromise) => {
    const start = Date.now();
    const timeout = opts.timeoutMs || 120000;

    const usePipe = outputJson || opts.capture;

    const child = spawn(cmd, argsArr, {
      cwd: opts.cwd || ROOT,
      shell: platform() === "win32",
      stdio: usePipe ? "pipe" : "inherit",
      encoding: "utf8",
      timeout,
    });

    let stdout = "";
    let stderr = "";

    if (usePipe) {
      child.stdout?.on("data", (d) => {
        stdout += d;
      });
      child.stderr?.on("data", (d) => {
        stderr += d;
      });
    }

    const timeoutId = setTimeout(() => {
      child.kill();
      resolvePromise({
        code: 1,
        duration_ms: Date.now() - start,
        stdout,
        stderr: `Command timed out after ${timeout}ms`,
      });
    }, timeout);

    child.on("close", (code) => {
      clearTimeout(timeoutId);
      resolvePromise({
        code,
        duration_ms: Date.now() - start,
        stdout,
        stderr,
      });
    });

    child.on("error", (err) => {
      clearTimeout(timeoutId);
      resolvePromise({
        code: 1,
        duration_ms: Date.now() - start,
        stdout: "",
        stderr: err.message,
      });
    });
  });
}

async function runCheck(name, category, cmd, argsArr, opts = {}) {
  const checkStart = Date.now();
  log(`  ${C.cyan}▸${C.reset} ${name}...`);

  const result = await runCommand(cmd, argsArr, opts);

  const checkResult = {
    name,
    category,
    status: result.code === 0 ? "pass" : "fail",
    duration_ms: result.duration_ms,
    message: null,
    fix_available: opts.fixAvailable || false,
    fix_command: opts.fixCommand || null,
  };

  if (result.code !== 0 && result.stderr) {
    const stderrLines = result.stderr.split("\n").slice(0, 10).join("\n");
    checkResult.message = stderrLines.slice(0, 500);
  }

  const statusIcon =
    checkResult.status === "pass"
      ? `${C.green}✓${C.reset}`
      : `${C.red}✗${C.reset}`;
  log(`    ${statusIcon} ${name} (${result.duration_ms}ms)`);

  return checkResult;
}

async function checkCargoCheck() {
  if (FLAGS.quick) {
    return {
      name: "cargo_check",
      category: "backend",
      status: "skipped",
      duration_ms: 0,
      message: "Skipped (use without --quick)",
      fix_available: false,
    };
  }
  return runCheck("cargo_check", "backend", "cargo", ["check", "--all"], {
    fixAvailable: false,
    timeoutMs: 180000,
  });
}

async function checkCargoTest() {
  if (!FLAGS.full) {
    return {
      name: "cargo_test",
      category: "backend",
      status: "skipped",
      duration_ms: 0,
      message: "Skipped (use --full)",
      fix_available: false,
    };
  }
  return runCheck("cargo_test", "backend", "cargo", ["test", "--lib"], {
    fixAvailable: false,
    capture: true,
  });
}

async function checkFrontendTypeCheck() {
  if (FLAGS.quick) {
    return {
      name: "frontend_type_check",
      category: "frontend",
      status: "skipped",
      duration_ms: 0,
      message: "Skipped (use without --quick)",
      fix_available: false,
    };
  }
  return runCheck(
    "frontend_type_check",
    "frontend",
    "npx",
    ["tsc", "--noEmit"],
    {
      cwd: join(ROOT, "frontend"),
      fixAvailable: false,
      timeoutMs: 120000,
    },
  );
}

async function checkFrontendLint() {
  if (FLAGS.quick) {
    return {
      name: "frontend_lint",
      category: "frontend",
      status: "skipped",
      duration_ms: 0,
      message: "Skipped (use without --quick)",
      fix_available: false,
    };
  }
  return runCheck(
    "frontend_lint",
    "frontend",
    "npm",
    ["run", "frontend:lint"],
    {
      fixAvailable: false,
      timeoutMs: 180000,
    },
  );
}

async function checkFrontendTest() {
  if (!FLAGS.full) {
    return {
      name: "frontend_test",
      category: "frontend",
      status: "skipped",
      duration_ms: 0,
      message: "Skipped (use --full)",
      fix_available: false,
    };
  }
  return runCheck("frontend_test", "frontend", "npm", ["run", "test:ci"], {
    cwd: join(ROOT, "frontend"),
    fixAvailable: false,
    capture: true,
  });
}

async function checkTypesSyncStale() {
  const stampFile = join(ROOT, ".git", "types-sync-stamp");
  const typesDir = join(ROOT, "frontend", "src", "types");

  if (!existsSync(stampFile)) {
    return {
      name: "types_sync_stale",
      category: "types",
      status: "fail",
      duration_ms: 0,
      message: "types-sync-stamp not found - run npm run types:sync first",
      fix_available: true,
      fix_command: "types:sync",
    };
  }

  const stampContent = readFileSync(stampFile, "utf8").trim();
  const stampTime = parseInt(stampContent, 10);
  if (isNaN(stampTime)) {
    return {
      name: "types_sync_stale",
      category: "types",
      status: "fail",
      duration_ms: 0,
      message: "Invalid types-sync-stamp content",
      fix_available: true,
      fix_command: "types:sync",
    };
  }

  const srcTauriDir = join(ROOT, "src-tauri", "src");
  let newestRustFile = 0;

  function findNewest(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        findNewest(full);
      } else if (entry.name.endsWith(".rs")) {
        try {
          const mtime = statSync(full).mtimeMs;
          if (mtime > newestRustFile) newestRustFile = mtime;
        } catch {
          /* ignore */
        }
      }
    }
  }

  findNewest(srcTauriDir);

  if (newestRustFile > stampTime) {
    const rustDate = new Date(newestRustFile).toISOString();
    const syncDate = new Date(stampTime).toISOString();
    return {
      name: "types_sync_stale",
      category: "types",
      status: "fail",
      duration_ms: 0,
      message: `Types stale: Rust files newer (${rustDate}) than sync (${syncDate})`,
      fix_available: true,
      fix_command: "types:sync",
    };
  }

  const generatedTypes = join(typesDir, "generated-types.ts");
  if (existsSync(generatedTypes)) {
    const genMtime = statSync(generatedTypes).mtimeMs;
    if (genMtime < stampTime - 5000) {
      return {
        name: "types_sync_stale",
        category: "types",
        status: "warn",
        duration_ms: 0,
        message: "Generated types file older than stamp - consider re-sync",
        fix_available: true,
        fix_command: "types:sync",
      };
    }
  }

  return {
    name: "types_sync_stale",
    category: "types",
    status: "pass",
    duration_ms: 0,
    message: null,
    fix_available: false,
  };
}

async function checkSchemaDrift() {
  return runCheck(
    "schema_drift",
    "database",
    "node",
    [join(ROOT, "scripts", "detect-schema-drift.js")],
    {
      fixAvailable: false,
      capture: true,
    },
  );
}

async function checkArchitecture() {
  return runCheck(
    "architecture",
    "architecture",
    "node",
    [join(ROOT, "scripts", "backend-architecture-check.js")],
    {
      fixAvailable: false,
      capture: true,
    },
  );
}

async function checkMigrationSystem() {
  return runCheck(
    "migration_system",
    "database",
    "node",
    [join(ROOT, "scripts", "validate-migration-system.js")],
    {
      fixAvailable: false,
      capture: true,
    },
  );
}

async function checkMissingScripts() {
  const referencedInPackageJson = [
    "scripts/check-type-drift.js",
    "scripts/ci-type-drift-check.js",
  ];

  const missing = [];

  for (const script of referencedInPackageJson) {
    const fullPath = join(ROOT, script);
    if (!existsSync(fullPath)) {
      missing.push(script);
    }
  }

  if (missing.length > 0) {
    return {
      name: "missing_scripts",
      category: "meta",
      status: "warn",
      duration_ms: 0,
      message: `Scripts referenced but missing: ${missing.join(", ")}`,
      fix_available: false,
    };
  }

  return {
    name: "missing_scripts",
    category: "meta",
    status: "pass",
    duration_ms: 0,
    message: null,
    fix_available: false,
  };
}

const CHECKS = [
  { fn: checkCargoCheck, critical: true },
  { fn: checkFrontendTypeCheck, critical: true },
  { fn: checkTypesSyncStale, critical: true },
  { fn: checkFrontendLint, critical: false },
  { fn: checkSchemaDrift, critical: true },
  { fn: checkArchitecture, critical: true },
  { fn: checkMigrationSystem, critical: false },
  { fn: checkMissingScripts, critical: false },
  { fn: checkCargoTest, critical: false },
  { fn: checkFrontendTest, critical: false },
];

async function applyFixes(failedChecks) {
  const fixable = failedChecks.filter((c) => c.fix_available && c.fix_command);
  if (fixable.length === 0) return false;

  for (const check of fixable) {
    log(`\n  ${C.yellow}⟳${C.reset} Applying fix: ${check.fix_command}`);

    const fixCmd = check.fix_command;
    let result;
    if (fixCmd.startsWith("npm run ")) {
      const scriptName = fixCmd.slice("npm run ".length);
      result = await runCommand("npm", ["run", scriptName], { capture: true });
    } else {
      result = await runCommand("npm", ["run", fixCmd], { capture: true });
    }

    if (result.code === 0) {
      log(`  ${C.green}✓${C.reset} Fix applied: ${check.name}`);
    } else {
      log(`  ${C.red}✗${C.reset} Fix failed: ${check.name}`);
    }
  }

  return true;
}

async function main() {
  const startTime = Date.now();

  log(`\n${C.bold}RPMA Doctor${C.reset} - Project health check`);
  log(`${"─".repeat(50)}\n`);

  log("Running checks...\n");

  if (FLAGS.parallel) {
    const promises = CHECKS.map((c) => c.fn());
    const checkResults = await Promise.all(promises);
    for (const result of checkResults) {
      results.checks.push(result);
    }
  } else {
    for (const check of CHECKS) {
      const result = await check.fn();
      results.checks.push(result);
    }
  }

  results.summary.total = results.checks.length;
  results.summary.passed = results.checks.filter(
    (c) => c.status === "pass",
  ).length;
  results.summary.failed = results.checks.filter(
    (c) => c.status === "fail",
  ).length;
  results.summary.skipped = results.checks.filter(
    (c) => c.status === "skipped",
  ).length;
  results.summary.warnings = results.checks.filter(
    (c) => c.status === "warn",
  ).length;

  if (results.summary.warnings === undefined) results.summary.warnings = 0;
  results.fixable_checks = results.checks
    .filter((c) => c.status === "fail" && c.fix_available)
    .map((c) => c.name);

  const failed = results.checks.filter((c) => c.status === "fail");
  const warnings = results.checks.filter((c) => c.status === "warn");

  results.duration_ms = Date.now() - startTime;

  if (FLAGS.fix && failed.length > 0) {
    log(`\n${C.bold}Applying fixes...${C.reset}`);
    const fixed = await applyFixes(failed);
    if (fixed) {
      log(`\nRe-running checks...\n`);
      const recheckResults = await Promise.all(CHECKS.map((c) => c.fn()));
      results.checks = recheckResults;
      results.summary.passed = results.checks.filter(
        (c) => c.status === "pass",
      ).length;
      results.summary.failed = results.checks.filter(
        (c) => c.status === "fail",
      ).length;
      results.fixable_checks = results.checks
        .filter((c) => c.status === "fail" && c.fix_available)
        .map((c) => c.name);
    }
  }

  if (outputJson) {
    results.status =
      results.summary.failed > 0
        ? "fail"
        : results.summary.warnings > 0
          ? "warn"
          : "pass";
    results.exit_code =
      results.summary.failed > 0 ? 1 : results.summary.warnings > 0 ? 2 : 0;
    logJson(results);
    process.exit(results.exit_code);
  }

  log(`\n${"═".repeat(50)}`);
  log(`${C.bold}Summary${C.reset}`);
  log(`${"─".repeat(50)}`);

  const passedChecks = results.checks.filter((c) => c.status === "pass");
  const failedChecks = results.checks.filter((c) => c.status === "fail");
  const skippedChecks = results.checks.filter((c) => c.status === "skipped");
  const warnChecks = results.checks.filter((c) => c.status === "warn");

  if (passedChecks.length > 0) {
    log(`\n${C.green}Passed:${C.reset}`);
    for (const c of passedChecks) {
      log(`  ${C.green}✓${C.reset} ${c.name} (${c.duration_ms}ms)`);
    }
  }

  if (warnChecks.length > 0) {
    log(`\n${C.yellow}Warnings:${C.reset}`);
    for (const c of warnChecks) {
      log(
        `  ${C.yellow}⚠${C.reset} ${c.name}: ${c.message || "check details"}`,
      );
    }
  }

  if (failedChecks.length > 0) {
    log(`\n${C.red}Failed:${C.reset}`);
    for (const c of failedChecks) {
      log(`  ${C.red}✗${C.reset} ${c.name}: ${c.message || "check details"}`);
      if (c.fix_available) {
        log(`      ${C.cyan}→${C.reset} Fix with: ${c.fix_command}`);
      }
    }
  }

  if (skippedChecks.length > 0) {
    log(`\n${C.cyan}Skipped:${C.reset}`);
    for (const c of skippedChecks) {
      log(`  ${C.cyan}○${C.reset} ${c.name}`);
    }
  }

  log(`\n${"─".repeat(50)}`);
  log(`Total: ${results.summary.total} checks`);
  log(`  ${C.green}Passed: ${results.summary.passed}${C.reset}`);
  log(`  ${C.red}Failed: ${results.summary.failed}${C.reset}`);
  log(`  ${C.yellow}Warnings: ${results.summary.warnings}${C.reset}`);
  log(`  ${C.cyan}Skipped: ${results.summary.skipped}${C.reset}`);
  log(`Duration: ${results.duration_ms}ms`);

  if (failedChecks.length > 0) {
    results.status = "fail";
    results.exit_code = 1;
    log(`\n${C.red}${C.bold}Doctor check FAILED${C.reset}\n`);
  } else if (warnChecks.length > 0) {
    results.status = "warn";
    results.exit_code = 2;
    log(`\n${C.yellow}${C.bold}Doctor check PASSED with warnings${C.reset}\n`);
  } else {
    results.status = "pass";
    results.exit_code = 0;
    log(`\n${C.green}${C.bold}Doctor check PASSED${C.reset}\n`);
  }

  process.exit(results.exit_code);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
