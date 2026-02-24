#!/usr/bin/env node
/**
 * IPC Production Gate (ULTRA STRICT) — RPMA v2
 *
 * Deterministic security/architecture gate to enforce:
 * - ADR-006: session_token on protected IPC + server-side validation
 * - ADR-005: IPC thin adapter (NO SQL in IPC)
 * - ADR-007: correlation + ApiResponse envelope
 * - ADR-003: no unsafe unwrap/expect + avoid raw internal error leaks
 *
 * Also checks:
 * - Command registration consistency: main.rs generate_handler vs actual handlers
 * - No JWT/2FA remnants in backend (excluding docs/tests)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BACKEND_SRC = path.join(ROOT, "src-tauri", "src");
const MAIN_RS = path.join(BACKEND_SRC, "main.rs");
const DOMAINS_DIR = path.join(BACKEND_SRC, "domains");

// Strict allowlist for PUBLIC commands (no session_token requirement)
const PUBLIC_ALLOWLIST = new Set([
  "auth_login",
  "auth_create_account",
  "has_admins",
  "bootstrap_first_admin",
  // NOTE: auth_validate_session is considered PROTECTED by default in RPMA design.
  // If your codebase treats it as public, remove it from protected checks OR add it here intentionally.
]);

// Patterns that count as "auth validated" inside a protected IPC handler
const AUTH_VALIDATION_PATTERNS = [
  /authenticate!\s*\(/, // macro
  /auth_middleware::authenticate\s*\(/,
  /require_auth\s*\(/,
  /validate_session\s*\(/, // if you have a dedicated validation helper
];

// Correlation initialization patterns expected inside IPC
const CORRELATION_INIT_PATTERNS = [
  /init_correlation_context\s*\(/,
];

// Response envelope patterns expected
const RESPONSE_ENVELOPE_PATTERNS = [
  /ApiResponse\s*<[^>]+>/,
  /CompressedApiResponse/,
];

// Forbid SQL usage inside IPC files (domains/**/ipc/** only)
const FORBIDDEN_SQL_PATTERNS = [
  /\.execute\s*\(/,
  /\.prepare\s*\(/,
  /\.query_row\s*\(/,
  /\.query_map\s*\(/,
  /\brusqlite::/,

  // Raw SQL keywords (high-signal; keep strict)
  /\bSELECT\b/,
  /\bINSERT\b/,
  /\bUPDATE\b/,
  /\bDELETE\b/,
  /\bFROM\b/,
];

// Forbid unsafe patterns in IPC handlers
const FORBIDDEN_UNSAFE_PATTERNS = [
  /\.unwrap\s*\(\s*\)/,
  /\.expect\s*\(/,
];

// Heuristic “raw internal error leak” patterns (best effort)
const ERROR_LEAK_PATTERNS = [
  /rusqlite::Error/,
  /format!\s*\(\s*["'][^"']*\{\:\?\}[^"']*["']\s*,\s*err\s*\)/i,
  /err\.to_string\s*\(\s*\)/,
];

const JWT_2FA_REMNANTS = [
  /\bjsonwebtoken\b/,
  /\btotp\b/i,
  /\bTwoFactor\b/,
  /\brefresh_token\b/,
  /\bTokenService\b/,
];

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function isDir(p) {
  return fs.existsSync(p) && fs.statSync(p).isDirectory();
}

function walk(dir, opts = {}) {
  const { exts = [".rs"], excludeDirs = [] } = opts;
  const out = [];
  function rec(d) {
    for (const entry of fs.readdirSync(d)) {
      const full = path.join(d, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (excludeDirs.some((x) => full.includes(`${path.sep}${x}${path.sep}`) || full.endsWith(`${path.sep}${x}`))) {
          continue;
        }
        rec(full);
      } else {
        if (exts.some((e) => entry.endsWith(e))) out.push(full);
      }
    }
  }
  rec(dir);
  return out;
}

function rel(p) {
  return path.relative(ROOT, p);
}

function inIpcLayer(filePath) {
  // Only enforce IPC rules for: src-tauri/src/domains/**/ipc/**
  const norm = filePath.split(path.sep).join("/");
  return norm.includes("/src-tauri/src/domains/") && norm.includes("/ipc/");
}

function isExcludedForRemnants(filePath) {
  const norm = filePath.split(path.sep).join("/");
  return (
    norm.includes("/docs/") ||
    norm.includes("/doc/") ||
    norm.includes("/tests/") ||
    norm.includes("/test/") ||
    norm.includes("/fixtures/") ||
    norm.includes("/archive/")
  );
}

/**
 * Parse commands registered in tauri::generate_handler![...]
 * We accept both:
 *   tauri::generate_handler![a, b, c]
 * and multi-line variants.
 */
function parseGenerateHandlerCommands(mainRsContent) {
  const out = new Set();

  // Find blocks like generate_handler![ ... ]
  const re = /generate_handler!\s*\[(.*?)\]/gs;
  let m;
  while ((m = re.exec(mainRsContent))) {
    const inner = m[1];

    // Split by commas, keep last segment after '::' as function name
    const parts = inner
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const p of parts) {
      // Example: domains::auth::ipc::auth::auth_login
      const fn = p.split("::").pop();
      if (fn) out.add(fn);
    }
  }

  return out;
}

/**
 * Extract Tauri IPC command functions from Rust file.
 * Returns [{ name, signature, body, startIndex, endIndex }]
 *
 * We capture:
 *   #[tauri::command]
 *   pub async fn name(args...) -> Result<...> { body }
 *
 * Note: This is not a full Rust parser, but robust enough for a gate.
 */
function extractTauriCommandFns(fileContent) {
  const out = [];

  // Capture annotation + fn header
  const re = /#\s*\[\s*tauri::command\s*\]\s*[\s\S]*?\bpub\s+async\s+fn\s+([A-Za-z0-9_]+)\s*\(([\s\S]*?)\)\s*->\s*([\s\S]*?)\s*\{/g;

  let m;
  while ((m = re.exec(fileContent))) {
    const name = m[1];
    const args = m[2];
    const retType = m[3];

    const headerStart = m.index;
    const bodyStart = re.lastIndex - 1; // points at '{'

    // Find matching closing brace for body (simple brace counter)
    let i = bodyStart;
    let depth = 0;
    let end = -1;
    while (i < fileContent.length) {
      const ch = fileContent[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
      i++;
    }

    const body = end !== -1 ? fileContent.slice(bodyStart + 1, end) : "";
    const signature = `(${args}) -> ${retType}`.replace(/\s+/g, " ").trim();

    out.push({
      name,
      argsRaw: args,
      retTypeRaw: retType,
      signature,
      body,
      startIndex: headerStart,
      endIndex: end,
    });
  }

  return out;
}

function hasSessionTokenParam(argsRaw) {
  // Strict: must explicitly include session_token: String (or &str if you use that)
  // You can extend accepted types if needed.
  const cleaned = argsRaw.replace(/\s+/g, " ");
  return /\bsession_token\s*:\s*String\b/.test(cleaned) || /\bsession_token\s*:\s*&\s*str\b/.test(cleaned);
}

function matchesAny(patterns, text) {
  return patterns.some((p) => p.test(text));
}

function findMatches(patterns, text) {
  const hits = [];
  for (const p of patterns) {
    if (p.test(text)) hits.push(p.toString());
  }
  return hits;
}

function severityRank(s) {
  if (s === "CRITICAL") return 0;
  if (s === "MAJOR") return 1;
  return 2;
}

function run() {
  const results = {
    totalRegistered: 0,
    totalDetected: 0,
    public: 0,
    protected: 0,
    violations: [],
    commandIndex: new Map(), // name -> {file, ...}
  };

  // --- Step 1: Parse registrations
  if (!fs.existsSync(MAIN_RS)) {
    console.error(`❌ main.rs not found at ${rel(MAIN_RS)} — cannot audit registrations.`);
    process.exit(1);
  }

  const mainContent = readUtf8(MAIN_RS);
  const registered = parseGenerateHandlerCommands(mainContent);
  results.totalRegistered = registered.size;

  // --- Step 2: Scan IPC rust files for #[tauri::command]
  const rustFiles = walk(BACKEND_SRC, {
    exts: [".rs"],
    excludeDirs: ["target", ".git", "node_modules"],
  });

  const detected = new Map(); // name -> { file, fnInfo }
  for (const file of rustFiles) {
    if (!inIpcLayer(file)) continue;

    const content = readUtf8(file);
    const fns = extractTauriCommandFns(content);
    for (const fn of fns) {
      results.totalDetected++;
      if (!detected.has(fn.name)) {
        detected.set(fn.name, { file, fn });
      } else {
        // duplicate handler name
        results.violations.push({
          type: "CRITICAL",
          file,
          command: fn.name,
          issue: `Duplicate #[tauri::command] handler name also defined in ${rel(detected.get(fn.name).file)}`,
          hint: "Rename one handler or remove duplicate; command names must be unique.",
        });
      }
    }
  }

  // --- Step 3: Cross-check registered vs detected
  for (const cmd of registered) {
    if (!detected.has(cmd)) {
      results.violations.push({
        type: "CRITICAL",
        file: MAIN_RS,
        command: cmd,
        issue: "Command registered in generate_handler! but no #[tauri::command] handler found in domains/**/ipc/**",
        hint: "Either register the correct handler path or add the missing handler.",
      });
    }
  }

  for (const [cmd, info] of detected.entries()) {
    if (!registered.has(cmd)) {
      results.violations.push({
        type: "MAJOR",
        file: info.file,
        command: cmd,
        issue: "Handler exists but is not registered in main.rs generate_handler!",
        hint: "Register it in src-tauri/src/main.rs or remove dead handler.",
      });
    }
  }

  // --- Step 4: Per-command strict checks
  for (const [cmd, info] of detected.entries()) {
    const { file, fn } = info;
    const isPublic = PUBLIC_ALLOWLIST.has(cmd);
    if (isPublic) results.public++;
    else results.protected++;

    // Envelope check: return type should include ApiResponse or CompressedApiResponse
    if (!matchesAny(RESPONSE_ENVELOPE_PATTERNS, fn.retTypeRaw)) {
      results.violations.push({
        type: "MAJOR",
        file,
        command: cmd,
        issue: `Return type does not appear to use ApiResponse envelope: "${fn.signature}"`,
        hint: "IPC handlers should return Result<ApiResponse<T>, AppError> (or CompressedApiResponse).",
      });
    }

    // Correlation init check (strict for all commands)
    if (!matchesAny(CORRELATION_INIT_PATTERNS, fn.body)) {
      results.violations.push({
        type: "MAJOR",
        file,
        command: cmd,
        issue: "Missing correlation initialization (init_correlation_context) in IPC handler body",
        hint: "Call init_correlation_context(...) at IPC boundary to preserve ADR-007 tracing.",
      });
    }

    // Unsafe unwrap/expect in handler body
    const unsafeHits = findMatches(FORBIDDEN_UNSAFE_PATTERNS, fn.body);
    if (unsafeHits.length > 0) {
      results.violations.push({
        type: "CRITICAL",
        file,
        command: cmd,
        issue: `Unsafe usage in IPC handler body: ${unsafeHits.join(", ")}`,
        hint: "Replace unwrap/expect with proper error handling mapped to AppError.",
      });
    }

    // Error leak heuristics (best-effort)
    const leakHits = findMatches(ERROR_LEAK_PATTERNS, fn.body);
    if (leakHits.length > 0) {
      results.violations.push({
        type: "MAJOR",
        file,
        command: cmd,
        issue: `Potential internal error leak patterns in IPC handler body: ${leakHits.join(", ")}`,
        hint: "Map internal/db errors to AppError::internal_sanitized / Database and avoid exposing raw details.",
      });
    }

    if (!isPublic) {
      // Protected command must have session_token param
      if (!hasSessionTokenParam(fn.argsRaw)) {
        results.violations.push({
          type: "CRITICAL",
          file,
          command: cmd,
          issue: "Protected IPC handler missing `session_token: String` parameter",
          hint: "Add session_token to signature and validate it server-side (ADR-006).",
        });
      }

      // Protected command must validate auth
      if (!matchesAny(AUTH_VALIDATION_PATTERNS, fn.body)) {
        results.violations.push({
          type: "CRITICAL",
          file,
          command: cmd,
          issue: "Protected IPC handler does not appear to validate session_token (no authenticate!/validation call found)",
          hint: "Call authenticate!(...) or the canonical auth validation helper before domain operations.",
        });
      }
    }
  }

  // --- Step 5: SQL forbidden in IPC files (strict)
  for (const file of rustFiles) {
    if (!inIpcLayer(file)) continue;
    const content = readUtf8(file);

    // If file contains any forbidden SQL patterns, fail (even if not within function)
    // This is intentionally strict to prevent SQL creeping into IPC.
    const hits = findMatches(FORBIDDEN_SQL_PATTERNS, content);
    if (hits.length > 0) {
      results.violations.push({
        type: "CRITICAL",
        file,
        command: "",
        issue: `Forbidden SQL/DB patterns detected in IPC layer file: ${hits.join(", ")}`,
        hint: "Move SQL and rusqlite usage to infrastructure repositories/services (ADR-005/ADR-002).",
      });
    }
  }

  // --- Step 6: JWT/2FA remnants scan (strict, excluding docs/tests/archive)
  for (const file of rustFiles) {
    if (isExcludedForRemnants(file)) continue;

    const content = readUtf8(file);
    const hits = findMatches(JWT_2FA_REMNANTS, content);
    if (hits.length > 0) {
      results.violations.push({
        type: "CRITICAL",
        file,
        command: "",
        issue: `JWT/2FA remnants detected: ${hits.join(", ")}`,
        hint: "Remove JWT/refresh/2FA code and dependencies after UUID sessions migration.",
      });
    }
  }

  // --- Print report
  const totalCmds = detected.size;
  console.log("🔒 IPC PRODUCTION GATE (ULTRA STRICT)\n");
  console.log("---- COMMANDS ----");
  console.log("Registered in main.rs:", results.totalRegistered);
  console.log("Detected in IPC layer:", totalCmds);
  console.log("Public:", results.public);
  console.log("Protected:", results.protected);

  const violations = results.violations
    .sort((a, b) => severityRank(a.type) - severityRank(b.type))
    .map((v) => ({
      ...v,
      file: rel(v.file),
    }));

  console.log("\n---- VIOLATIONS ----");
  if (violations.length === 0) {
    console.log("✅ PRODUCTION GATE: PASS");
    process.exit(0);
  }

  const grouped = { CRITICAL: [], MAJOR: [], MINOR: [] };
  for (const v of violations) grouped[v.type] = grouped[v.type] || [];
  for (const v of violations) grouped[v.type].push(v);

  for (const level of ["CRITICAL", "MAJOR", "MINOR"]) {
    if (!grouped[level] || grouped[level].length === 0) continue;
    console.log(`\n${level} (${grouped[level].length})`);
    for (const v of grouped[level]) {
      const cmdLabel = v.command ? ` — ${v.command}` : "";
      console.log(`- ${v.file}${cmdLabel}`);
      console.log(`  Issue: ${v.issue}`);
      if (v.hint) console.log(`  Hint:  ${v.hint}`);
    }
  }

  console.log("\n❌ PRODUCTION GATE: FAIL");
  process.exit(1);
}

run();