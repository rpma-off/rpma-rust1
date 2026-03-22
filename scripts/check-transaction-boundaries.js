#!/usr/bin/env node
/**
 * check-transaction-boundaries.js
 *
 * Détecte les séquences d'écritures multi-tables dans les fichiers
 * infrastructure/ qui ne sont PAS encadrées par une transaction.
 *
 * Dans ce codebase, deux patterns sûrs existent (voir queries.rs) :
 *   ✅  db.with_transaction(|tx| { tx.execute(...); tx.execute(...); })
 *   ✅  let tx = conn.transaction()?;  ...  tx.commit()?;
 *
 * Le pattern dangereux :
 *   ❌  self.db.execute("INSERT ...", ...)?;
 *       self.db.execute("UPDATE ...", ...)?;   ← si 1ère écrit réussit et 2ème plante
 *                                               la DB est dans un état incohérent.
 *
 * Checks :
 *   TB1 — Fonction avec 2+ self.db.execute() sans marqueur de transaction
 *   TB2 — Boucle for/while avec self.db.execute() sans marqueur de transaction
 *   TB3 — execute_batch() utilisé avec du DML (INSERT/UPDATE/DELETE) — non transactionnel
 *
 * Exit codes :
 *   0 – tous les checks passent (warnings peuvent être présents)
 *   1 – au moins une erreur
 *
 * Usage :
 *   node scripts/check-transaction-boundaries.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────

const ROOT        = path.resolve(__dirname, '..');
const DOMAINS_DIR = path.join(ROOT, 'src-tauri', 'src', 'domains');

// Noms de fonctions exemptées (fonctions helper mono-write intentionnellement).
// Format : "domain/relative/path.rs::fn_name"
const EXEMPT_FUNCTIONS = new Set([
  // Ajouter ici les faux positifs documentés avec justification.
]);

// Marqueurs indiquant qu'une fonction est déjà dans une transaction
// ou qu'elle crée une transaction explicitement.
const TX_MARKERS = [
  'with_transaction(',       // db.with_transaction(|tx| { ... })
  '.transaction()',          // conn.transaction()?
  'tx.execute(',             // variable nommée "tx" → dans une closure de transaction
  'tx.prepare(',             // idem
  'begin_transaction',       // méthode custom si elle existe
  '|tx|',                    // closure de transaction (with_transaction argument)
];

// Méthodes directes sur le DB abstraction qui écrivent dans la base.
// On ne compte PAS tx.execute() ici — c'est déjà couvert par TX_MARKERS.
const DIRECT_WRITE_RE = /\bself\s*\.\s*db\s*\.\s*execute\s*\(|[^t][^x]\s*\.\s*db\s*\.\s*execute\s*\(/g;

// Pattern DML dans les chaînes (pour TB3 : execute_batch avec DML)
const DML_IN_STRING_RE = /["'`r#"]\s*(INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)/i;

const errors   = [];
const warnings = [];

function addError(msg)   { errors.push(msg); }
function addWarning(msg) { warnings.push(msg); }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Collecte récursivement tous les .rs dans un dossier. */
function collectRustFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...collectRustFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.rs')) results.push(full);
  }
  return results;
}

/**
 * Extrait les corps de fonctions d'un fichier Rust.
 * Approche : comptage de profondeur d'accolades ligne par ligne.
 * Retourne : Array de { name, body, startLine, file }
 *
 * Limitations connues (heuristique) :
 *  - Ne gère pas les accolades dans les chaînes multi-lignes r#"..."#
 *  - Les blocs impl/mod/struct emboîtés peuvent fausser la détection
 *  → Acceptable pour un détecteur statique : les faux positifs sont rares
 *    dans du code infra bien structuré.
 */
function extractFunctionBodies(content, filePath) {
  const lines    = content.split('\n');
  const fns      = [];

  let fnName     = null;
  let fnLine     = -1;
  let depth      = 0;
  let inBody     = false;
  let bodyLines  = [];

  // Track #[cfg(test)] sections to skip test functions
  let inTestMod  = false;
  let testDepth  = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw  = lines[i];
    const line = raw.trimStart();

    // Detect test modules/sections — skip their bodies
    if (/#\[cfg\s*\(\s*test\s*\)\]/.test(line)) {
      inTestMod = true;
      testDepth = depth;
    }
    if (inTestMod && depth <= testDepth && i > 0 && !inBody) {
      // Once we return to the same depth after the test module, stop skipping
      if (depth < testDepth) inTestMod = false;
    }

    if (!inBody) {
      // Detect `fn name(` declarations — skip test fns, closures, and trait defaults
      const fnMatch = raw.match(/^\s*(?:#\[.*\]\s*)*(?:pub\s*)?(?:pub\s*\([^)]*\)\s*)?(?:async\s+)?fn\s+(\w+)\s*[<(]/);
      if (fnMatch && !inTestMod) {
        fnName   = fnMatch[1];
        fnLine   = i + 1;
        bodyLines = [];
        depth    = 0;
      }

      // Count depth in non-body lines to find the opening {
      if (fnName !== null) {
        for (const ch of raw) {
          if (ch === '{') {
            depth++;
            if (depth === 1) {
              inBody = true;
            }
          } else if (ch === '}') {
            depth--;
          }
        }
      }

      if (inBody) bodyLines.push(raw);
      continue;
    }

    // We're inside a function body
    bodyLines.push(raw);

    for (const ch of raw) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          // End of function
          if (fnName && !inTestMod) {
            fns.push({
              name:      fnName,
              body:      bodyLines.join('\n'),
              startLine: fnLine,
              file:      filePath,
            });
          }
          inBody    = false;
          fnName    = null;
          fnLine    = -1;
          bodyLines = [];
          depth     = 0;
          break;
        }
      }
    }
  }

  return fns;
}

/** Vérifie si un corps de fonction contient un marqueur de transaction. */
function hasTransactionMarker(body) {
  return TX_MARKERS.some((marker) => body.includes(marker));
}

/** Compte les appels directs self.db.execute() dans un corps de fonction.
 *  Ignore les occurrences dans des closures with_transaction (déjà couvertes). */
function countDirectWrites(body) {
  // Remove with_transaction closures to avoid counting tx.execute as db.execute
  const withoutTxClosures = body.replace(
    /with_transaction\s*\(\s*\|[^|]*\|\s*\{[\s\S]*?\}\s*\)/g,
    ''
  );
  const matches = withoutTxClosures.match(DIRECT_WRITE_RE);
  return matches ? matches.length : 0;
}

/** Vérifie si le corps contient une boucle for/while avec des writes directs. */
function hasLoopWithDirectWrites(body) {
  // Simple heuristic: look for "for ... {" or "while ... {" blocks that contain
  // self.db.execute without a transaction marker in the same block
  if (!DIRECT_WRITE_RE.test(body)) return false;
  DIRECT_WRITE_RE.lastIndex = 0; // reset global regex

  // Check for for/while patterns with execute inside
  return (
    /\b(?:for|while)\s+[^{]+\{[\s\S]*?self\s*\.\s*db\s*\.\s*execute\s*\(/.test(body) &&
    !hasTransactionMarker(body)
  );
}

// ─── TB1: Multi-write sans transaction ───────────────────────────────────────

function checkTB1(fn, relPath) {
  if (hasTransactionMarker(fn.body)) return;

  const writeCount = countDirectWrites(fn.body);
  if (writeCount < 2) return;

  const key = `${relPath}::${fn.name}`;
  if (EXEMPT_FUNCTIONS.has(key)) return;

  addError(
    `[ADR-009] TB1 — Fonction '${fn.name}' contient ${writeCount} écritures directes (self.db.execute)\n` +
    `  sans transaction — échec partiel = état DB incohérent :\n` +
    `  ${relPath}:${fn.startLine}\n` +
    `  → Encadrer avec db.with_transaction(|tx| { ... }) ou conn.transaction()?\n` +
    `    Pour exempter : ajouter "${key}" dans EXEMPT_FUNCTIONS`
  );
}

// ─── TB2: Boucle avec writes directs sans transaction ────────────────────────

function checkTB2(fn, relPath) {
  if (hasTransactionMarker(fn.body)) return;
  if (!hasLoopWithDirectWrites(fn.body)) return;

  const key = `${relPath}::${fn.name}`;
  if (EXEMPT_FUNCTIONS.has(key)) return;

  addWarning(
    `[ADR-009] TB2 — Fonction '${fn.name}' contient une boucle avec self.db.execute\n` +
    `  sans transaction — chaque itération est un commit indépendant :\n` +
    `  ${relPath}:${fn.startLine}\n` +
    `  → Encadrer la boucle entière dans db.with_transaction(|tx| { for ... { tx.execute(...); } })`
  );
}

// ─── TB3: execute_batch avec DML ─────────────────────────────────────────────

function checkTB3(lines, relPath) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/execute_batch\s*\(/.test(line)) continue;

    // Lookahead for DML within 10 lines of the execute_batch call
    const window = lines.slice(i, i + 10).join('\n');
    if (DML_IN_STRING_RE.test(window)) {
      addError(
        `[ADR-009] TB3 — execute_batch() utilisé avec du DML (INSERT/UPDATE/DELETE)\n` +
        `  execute_batch n'est pas transactionnel pour des séquences DML :\n` +
        `  ${relPath}:${i + 1}\n` +
        `  → Utiliser db.with_transaction(|tx| { ... }) pour les écritures multiples`
      );
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (!fs.existsSync(DOMAINS_DIR)) {
  console.error(`ERROR: domains directory not found at ${DOMAINS_DIR}`);
  process.exit(1);
}

let filesChecked = 0;
let fnsChecked   = 0;

const domainDirs = fs
  .readdirSync(DOMAINS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

for (const domain of domainDirs) {
  // Only check infrastructure/ layer — that's where all DB writes should live
  const infraDir = path.join(DOMAINS_DIR, domain, 'infrastructure');
  if (!fs.existsSync(infraDir)) continue;

  for (const file of collectRustFiles(infraDir)) {
    const content  = fs.readFileSync(file, 'utf8');
    const relPath  = path.relative(ROOT, file).replace(/\\/g, '/');
    const lines    = content.split('\n');

    // TB3 (file-level scan)
    checkTB3(lines, relPath);

    // TB1 + TB2 (per function)
    const fns = extractFunctionBodies(content, file);
    fnsChecked += fns.length;

    for (const fn of fns) {
      checkTB1(fn, relPath);
      checkTB2(fn, relPath);
    }

    filesChecked++;
  }
}

// ─── Report ───────────────────────────────────────────────────────────────────

console.log('\n── Transaction Boundary Check ──────────────────────────────');
console.log(`Analysé ${filesChecked} fichiers infrastructure/, ${fnsChecked} fonctions.\n`);

if (warnings.length > 0) {
  console.log(`WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log(`  ⚠  ${w}\n`);
}

if (errors.length > 0) {
  console.log(`ERRORS (${errors.length}):`);
  for (const e of errors) console.log(`  ✖  ${e}\n`);
  console.log(`\nTransaction boundary check FAILED avec ${errors.length} erreur(s).`);
  process.exit(1);
}

console.log('Transaction boundary check PASSED ✓');
process.exit(0);
