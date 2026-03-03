#!/usr/bin/env node

/**
 * RPMA v2 Maintainability Audit Script
 *
 * Detects:
 *   - Functions > 80 lines (Rust + TypeScript/TSX)
 *   - IPC handlers > 40 lines (Rust)
 *   - Application services > 200 lines (Rust)
 *   - Excessive match/if nesting > 4 depth (Rust + TypeScript)
 *   - Repeated logic patterns across domains
 *   - Fat React components > 200 lines (TSX)
 *   - Forced split/refactor rules for oversized, mixed-responsibility files/components
 *
 * Returns:
 *   - High-risk file list with Maintainability Risk Score (1–10)
 *   - Suggested extraction targets (service / helper / module)
 *   - Patch refactor hints (before/after sketches)
 *   - JSON report saved to maintainability-report.json
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────────────────

const CONFIG = {
    thresholds: {
        functionLines: 80,
        ipcHandlerLines: 40,
        applicationServiceLines: 200,
        nestingDepth: 4,
        reactComponentLines: 200,
        forceSplitLines: 500,
        forceSplitMethods: 10,
        forceSplitResponsibilities: 3,
        repeatedLogicThreshold: 3,
        minRepeatedLogicLineLength: 20,
        forceRefactorUseEffects: 5,
        forceRefactorDerivedStates: 3,
    },
    excludedDirs: ['node_modules', '.next', 'dist', 'target', '__tests__', '.git'],
    projectRoot: path.join(__dirname, '..'),
};

const FRONTEND_SRC = path.join(CONFIG.projectRoot, 'frontend', 'src');
const BACKEND_SRC = path.join(CONFIG.projectRoot, 'src-tauri', 'src');

// ─── Colour helpers ───────────────────────────────────────────────────────────

const C = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
};

function colour(text, ...codes) {
    return codes.join('') + text + C.reset;
}

// ─── File helpers ─────────────────────────────────────────────────────────────

function walkFiles(dir, extensions) {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (CONFIG.excludedDirs.includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...walkFiles(full, extensions));
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
            results.push(full);
        }
    }
    return results;
}

function readLines(filePath) {
    return fs.readFileSync(filePath, 'utf8').split('\n');
}

function relPath(filePath) {
    return path.relative(CONFIG.projectRoot, filePath);
}

// ─── Risk scoring ─────────────────────────────────────────────────────────────

/**
 * Compute a Maintainability Risk Score (1–10) given a set of findings.
 * Each finding contributes weighted points; the result is capped at 10.
 */
function computeRiskScore(findings) {
    let score = 0;
    for (const f of findings) {
        switch (f.type) {
            case 'force-split':
            case 'force-refactor-component': score += 10; break;
            case 'fat-react-component': score += 3; break;
            case 'long-function': score += 2; break;
            case 'fat-ipc-handler': score += 2; break;
            case 'fat-application-service': score += 2; break;
            case 'deep-nesting': score += 2; break;
            case 'repeated-pattern': score += 1; break;
            default: score += 1;
        }
    }
    return Math.min(10, score);
}

// ─── Rust analysis ────────────────────────────────────────────────────────────

/**
 * Split a Rust source file into top-level function bodies.
 * Uses a simple brace-counting heuristic – good enough for reporting purposes.
 */
function extractRustFunctions(lines) {
    const functions = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i].trim();
        // Match `fn` or `async fn` declarations (pub, pub(crate), etc.)
        const fnMatch = line.match(/^(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+(\w+)/);
        if (fnMatch) {
            const name = fnMatch[1];
            const startLine = i + 1; // 1-indexed
            let depth = 0;
            let started = false;
            let j = i;

            while (j < lines.length) {
                for (const ch of lines[j]) {
                    if (ch === '{') { depth++; started = true; }
                    else if (ch === '}') { depth--; }
                }
                if (started && depth === 0) {
                    functions.push({ name, startLine, endLine: j + 1, lineCount: j - i + 1 });
                    i = j; // advance outer loop past function body
                    break;
                }
                j++;
            }
        }
        i++;
    }
    return functions;
}

/**
 * Measure maximum brace/indentation nesting depth in a file.
 * For Rust: count `{` / `}` delimiters.
 * For TS: same approach.
 */
function measureNestingDepth(lines) {
    let maxDepth = 0;
    let depth = 0;
    let maxDepthLine = 0;

    lines.forEach((line, idx) => {
        // Skip string/comment heuristic: ignore lines that are pure comments
        const stripped = line.replace(/\/\/.*$/, '').replace(/"[^"]*"/g, '""');
        for (const ch of stripped) {
            if (ch === '{') { depth++; if (depth > maxDepth) { maxDepth = depth; maxDepthLine = idx + 1; } }
            else if (ch === '}') { depth = Math.max(0, depth - 1); }
        }
    });
    return { maxDepth, maxDepthLine };
}

/**
 * Count `match` arms / `if` chains at a given depth to detect excessive branching.
 */
function countBranchingStatements(lines) {
    let count = 0;
    for (const line of lines) {
        const t = line.trim();
        if (t.startsWith('match ') || t.startsWith('if ') || t.startsWith('} else if ') || t.startsWith('else if ')) {
            count++;
        }
    }
    return count;
}

function countRepeatedLogic(lines) {
    const counts = new Map();
    for (const line of lines) {
        const normalised = line
            .trim()
            .replace(/\/\/.*$/, '')
            .replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '"STR"')
            .replace(/\b\d+\b/g, 'N');
        if (normalised.length < CONFIG.thresholds.minRepeatedLogicLineLength) continue;
        counts.set(normalised, (counts.get(normalised) || 0) + 1);
    }
    return [...counts.values()].filter(v => v >= CONFIG.thresholds.repeatedLogicThreshold).length;
}

function detectResponsibilities(lines, language) {
    const text = lines.join('\n');
    const categories = [
        [/(SELECT|INSERT|UPDATE|DELETE|query!|query\(|execute\(|sqlx::|rusqlite)/i, 'database'],
        [/(read_to_string|readFileSync|writeFileSync|write_all|File::|fs::|std::fs|open\(|write\()/i, 'filesystem'],
        [/(fetch\(|axios|reqwest|http::|invoke\()/i, 'network'],
        [/(validate|sanitize|schema|zod|validator)/i, 'validation'],
        [/(calculate|pricing|business|rule|policy|workflow|eligibility)/i, 'business-rules'],
        [/(map\(|filter\(|reduce\(|transform|serialize|deserialize|to_json|from_json)/i, 'transformation'],
        [/(console\.|tracing::|log::|println!|debug!|warn!|error!)/i, 'logging'],
    ];

    const matched = new Set();
    for (const [pattern, name] of categories) {
        if (pattern.test(text)) matched.add(name);
    }
    if (language === 'tsx' || language === 'ts') {
        if (/\buseEffect\s*\(/.test(text)) matched.add('react-effects');
    }
    return matched.size;
}

function hasMixedIoAndBusiness(lines) {
    const text = lines.join('\n');
    const io = /(SELECT|INSERT|UPDATE|DELETE|query!|query\(|execute\(|sqlx::|rusqlite|read_to_string|readFileSync|writeFileSync|write_all|File::|fs::|std::fs|fetch\(|axios|reqwest|http::|invoke\()/i.test(text);
    const business = /(calculate|pricing|business|rule|policy|workflow|eligibility|validate|sanitize)/i.test(text);
    return io && business;
}

function enforceForceSplitRule({ lines, methodCount, findings, language }) {
    const responsibilities = detectResponsibilities(lines, language);
    const repeatedLogicClusters = countRepeatedLogic(lines);
    const mixedIoBusiness = hasMixedIoAndBusiness(lines);
    if (
        lines.length > CONFIG.thresholds.forceSplitLines &&
        methodCount > CONFIG.thresholds.forceSplitMethods &&
        responsibilities > CONFIG.thresholds.forceSplitResponsibilities &&
        mixedIoBusiness &&
        repeatedLogicClusters > 0
    ) {
        findings.push({
            type: 'force-split',
            message: `File triggers FORCE SPLIT (${lines.length} lines, ${methodCount} methods, ${responsibilities} responsibilities, mixed IO/business, repeated logic)`,
            line: 1,
            suggestion: 'Split this file into focused modules to separate IO concerns from business logic and deduplicate repeated flows',
            patchHint: '// Split into separate modules (IO adapters, domain services, shared helpers) and keep each responsibility isolated.',
        });
    }
}

function countDerivedStates(lines) {
    return lines.filter(line => {
        const t = line.trim();
        return (
            /const\s+\w+\s*=\s*useMemo\s*\(/.test(t) ||
            /const\s+\w+\s*=\s*(?:\[[^\]]*\]|\w+)\.(map|filter|reduce|sort|find)\(/.test(t) ||
            /const\s+\w+\s*=\s*.*\?.*:/.test(t)
        );
    }).length;
}

function analyseRustFile(filePath) {
    const lines = readLines(filePath);
    const rel = relPath(filePath);
    const findings = [];

    // --- Function length ---
    const functions = extractRustFunctions(lines);
    const methodCount = functions.length;
    for (const fn of functions) {
        if (fn.lineCount > CONFIG.thresholds.functionLines) {
            findings.push({
                type: 'long-function',
                message: `Function \`${fn.name}\` is ${fn.lineCount} lines (>${CONFIG.thresholds.functionLines})`,
                line: fn.startLine,
                suggestion: `Extract logical blocks within \`${fn.name}\` into private helper functions`,
                patchHint: `// BEFORE: one large fn ${fn.name}() { … }\n// AFTER:  fn ${fn.name}() { step_a(…); step_b(…); step_c(…); }`,
            });
        }
    }

    // --- IPC handler check (files under domains/*/ipc/) ---
    if (rel.includes(`${path.sep}ipc${path.sep}`) || rel.includes('/ipc/')) {
        for (const fn of functions) {
            if (fn.lineCount > CONFIG.thresholds.ipcHandlerLines) {
                findings.push({
                    type: 'fat-ipc-handler',
                    message: `IPC handler \`${fn.name}\` is ${fn.lineCount} lines (>${CONFIG.thresholds.ipcHandlerLines})`,
                    line: fn.startLine,
                    suggestion: `IPC handlers should only authenticate → validate → delegate. Extract business logic to an application service`,
                    patchHint: `// BEFORE: pub async fn ${fn.name}(…) { /* 60+ lines */ }\n// AFTER:  pub async fn ${fn.name}(…) {\n//     let user = authenticate!(…);\n//     let result = ${fn.name}_service.execute(input).await?;\n//     Ok(ApiResponse::success(result))\n// }`,
                });
            }
        }
    }

    // --- Application service check (files under domains/*/application/) ---
    if (rel.includes(`${path.sep}application${path.sep}`) || rel.includes('/application/')) {
        if (lines.length > CONFIG.thresholds.applicationServiceLines) {
            findings.push({
                type: 'fat-application-service',
                message: `Application service file is ${lines.length} lines (>${CONFIG.thresholds.applicationServiceLines})`,
                line: 1,
                suggestion: `Split into focused use-case modules (e.g. create.rs, update.rs, query.rs) under a sub-module folder`,
                patchHint: `// Split ${path.basename(filePath)} into:\n//   mod create;\n//   mod update;\n//   mod query;\n//   pub use self::{create::*, update::*, query::*};`,
            });
        }
    }

    // --- Deep nesting ---
    const { maxDepth, maxDepthLine } = measureNestingDepth(lines);
    if (maxDepth > CONFIG.thresholds.nestingDepth) {
        findings.push({
            type: 'deep-nesting',
            message: `Max brace-nesting depth is ${maxDepth} (>${CONFIG.thresholds.nestingDepth}) around line ${maxDepthLine}`,
            line: maxDepthLine,
            suggestion: 'Apply early-return / guard-clause pattern or extract deeply nested blocks into helper functions',
            patchHint: `// BEFORE: if a { if b { if c { if d { /* logic */ } } } }\n// AFTER:  if !a || !b || !c || !d { return Err(…); }\n//         /* logic */`,
        });
    }

    // --- Force split rule ---
    enforceForceSplitRule({ lines, methodCount, findings, language: 'rust' });

    return findings;
}

// ─── TypeScript / TSX analysis ────────────────────────────────────────────────

/**
 * Extract top-level function / arrow-function / React component spans from TS/TSX.
 * Uses a lightweight heuristic (brace counting), not a full AST.
 */
function extractTsFunctions(lines) {
    const functions = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Match: export default function Name / export function Name / function Name /
        //        const Name = (…) => { / const Name: React.FC = (…) => {
        const fnMatch =
            trimmed.match(/^(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+(\w+)/) ||
            trimmed.match(/^(?:export\s+)?const\s+(\w+)\s*(?::[^=]+)?=\s*(?:async\s+)?\(?/);

        if (fnMatch) {
            const name = fnMatch[1];
            const startLine = i + 1;
            let depth = 0;
            let started = false;
            let j = i;

            while (j < lines.length) {
                const l = lines[j].replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '""');
                for (const ch of l) {
                    if (ch === '{') { depth++; started = true; }
                    else if (ch === '}') { depth--; }
                }
                if (started && depth === 0) {
                    functions.push({ name, startLine, endLine: j + 1, lineCount: j - i + 1 });
                    i = j;
                    break;
                }
                j++;
            }
        }
        i++;
    }
    return functions;
}

function analyseTsFile(filePath) {
    const lines = readLines(filePath);
    const rel = relPath(filePath);
    const isTsx = filePath.endsWith('.tsx');
    const findings = [];

    // --- Fat React component ---
    if (isTsx && lines.length > CONFIG.thresholds.reactComponentLines) {
        findings.push({
            type: 'fat-react-component',
            message: `React component file is ${lines.length} lines (>${CONFIG.thresholds.reactComponentLines})`,
            line: 1,
            suggestion: `Split into smaller sub-components or custom hooks. Extract repeated JSX blocks into reusable components`,
            patchHint: `// Extract sections into:\n//   <HeaderSection />\n//   <BodySection />\n//   useXxxLogic() hook`,
        });
    }

    // --- Long functions inside TS/TSX ---
    const functions = extractTsFunctions(lines);
    const methodCount = functions.length;
    for (const fn of functions) {
        if (fn.lineCount > CONFIG.thresholds.functionLines) {
            findings.push({
                type: 'long-function',
                message: `Function/component \`${fn.name}\` is ${fn.lineCount} lines (>${CONFIG.thresholds.functionLines})`,
                line: fn.startLine,
                suggestion: `Extract sub-sections of \`${fn.name}\` into dedicated helper functions or sub-components`,
                patchHint: `// Extract logical blocks from ${fn.name} into:\n//   function handle${capitalize(fn.name)}Submit() { … }\n//   function render${capitalize(fn.name)}Rows() { … }`,
            });
        }
    }

    // --- Deep nesting ---
    const { maxDepth, maxDepthLine } = measureNestingDepth(lines);
    if (maxDepth > CONFIG.thresholds.nestingDepth) {
        findings.push({
            type: 'deep-nesting',
            message: `Max brace-nesting depth is ${maxDepth} (>${CONFIG.thresholds.nestingDepth}) around line ${maxDepthLine}`,
            line: maxDepthLine,
            suggestion: 'Use early returns, optional chaining (?.), or extract nested logic to helper functions',
            patchHint: `// BEFORE: if (a) { if (b) { if (c) { … } } }\n// AFTER:  if (!a || !b || !c) return;\n//         …`,
        });
    }

    // --- Force split rule (non-component files too) ---
    enforceForceSplitRule({ lines, methodCount, findings, language: isTsx ? 'tsx' : 'ts' });

    // --- Force refactor React component rule ---
    if (isTsx) {
        const useEffectCount = lines.filter(line => /\buseEffect\s*\(/.test(line)).length;
        const derivedStateCount = countDerivedStates(lines);
        if (
            lines.length > CONFIG.thresholds.reactComponentLines &&
            useEffectCount > CONFIG.thresholds.forceRefactorUseEffects &&
            derivedStateCount > CONFIG.thresholds.forceRefactorDerivedStates
        ) {
            findings.push({
                type: 'force-refactor-component',
                message: `Component triggers FORCE REFACTOR (${lines.length} lines, ${useEffectCount} useEffect, ${derivedStateCount} derived states)`,
                line: 1,
                suggestion: 'Extract custom hooks/sub-components to reduce effect density and derived state sprawl',
                patchHint: '// Split component into UI sub-sections and move orchestration logic into dedicated hooks.',
            });
        }
    }

    return findings;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Duplication / repeated-pattern detection ─────────────────────────────────

/**
 * Detect repeated patterns across domains by collecting "signature lines" –
 * meaningful non-trivial statements – and counting how often the same pattern
 * appears in ≥ 3 different domain directories.
 */
function detectRepeatedPatterns() {
    const DOMAINS = path.join(BACKEND_SRC, 'domains');
    if (!fs.existsSync(DOMAINS)) return [];

    const domainNames = fs.readdirSync(DOMAINS, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name);

    // Collect auth/validate/map patterns per domain
    const patternMap = {}; // pattern → Set<domain>

    const TRIVIAL = /^(use |mod |pub |\/\/|#\[|}\s*$|let\s|return\s|Ok\(|Err\(|async fn|fn |\s*$)/;

    for (const domain of domainNames) {
        const domainPath = path.join(DOMAINS, domain);
        const rsFiles = walkFiles(domainPath, ['.rs']);

        for (const file of rsFiles) {
            const lines = readLines(file);
            for (const line of lines) {
                const t = line.trim();
                // Only keep non-trivial, substantial lines
                if (t.length < 20 || TRIVIAL.test(t)) continue;
                // Normalise identifiers to reduce noise
                const normalised = t
                    .replace(/\b[a-z_]+_id\b/g, '<ID>')
                    .replace(/"[^"]*"/g, '"<STR>"')
                    .replace(/\b\d+\b/g, '<N>');
                if (!patternMap[normalised]) patternMap[normalised] = new Set();
                patternMap[normalised].add(domain);
            }
        }
    }

    const repeated = [];
    for (const [pattern, domains] of Object.entries(patternMap)) {
        if (domains.size >= 3) {
            repeated.push({ pattern, domains: [...domains] });
        }
    }
    // Return top 10 most-repeated patterns
    return repeated.slice(0, 10);
}

// ─── Main audit runner ────────────────────────────────────────────────────────

function runAudit({ strict = false } = {}) {
    console.log(colour('\n🔍 RPMA v2 Maintainability Audit', C.bold, C.cyan));
    console.log(colour('═'.repeat(60), C.dim));

    const fileResults = []; // { file, findings, riskScore }

    // --- Rust files ---
    console.log(colour('\n📦 Analysing Rust backend…', C.cyan));
    const rustFiles = walkFiles(BACKEND_SRC, ['.rs'])
        .filter(f => !f.includes('/tests/') && !f.includes('/benches/') && !f.endsWith('_test.rs'));

    for (const file of rustFiles) {
        const findings = analyseRustFile(file);
        if (findings.length > 0) {
            const riskScore = computeRiskScore(findings);
            fileResults.push({ file: relPath(file), findings, riskScore });
        }
    }

    // --- TypeScript / TSX files ---
    console.log(colour('🌐 Analysing TypeScript frontend…', C.cyan));
    const tsFiles = walkFiles(FRONTEND_SRC, ['.ts', '.tsx'])
        .filter(f => !f.includes('/__tests__/') && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx') && !f.endsWith('.spec.ts'));

    for (const file of tsFiles) {
        const findings = analyseTsFile(file);
        if (findings.length > 0) {
            const riskScore = computeRiskScore(findings);
            fileResults.push({ file: relPath(file), findings, riskScore });
        }
    }

    // --- Repeated patterns ---
    console.log(colour('🔁 Detecting repeated cross-domain patterns…', C.cyan));
    const repeatedPatterns = detectRepeatedPatterns();

    // ── Sort by risk score descending ──────────────────────────────────────────
    fileResults.sort((a, b) => b.riskScore - a.riskScore);

    // ── Print results ──────────────────────────────────────────────────────────
    const highRisk = fileResults.filter(r => r.riskScore >= 7);
    const mediumRisk = fileResults.filter(r => r.riskScore >= 4 && r.riskScore < 7);
    const lowRisk = fileResults.filter(r => r.riskScore < 4);

    console.log(colour('\n═'.repeat(60), C.dim));
    console.log(colour('📊 AUDIT RESULTS', C.bold));
    console.log(colour('═'.repeat(60), C.dim));

    printRiskGroup('🔴 HIGH RISK (score 7–10)', highRisk, C.red);
    printRiskGroup('🟡 MEDIUM RISK (score 4–6)', mediumRisk, C.yellow);
    printRiskGroup('🟢 LOW RISK (score 1–3)', lowRisk, C.green);

    if (repeatedPatterns.length > 0) {
        console.log(colour('\n🔁 Repeated Patterns (≥3 domains)', C.bold, C.yellow));
        console.log(colour('─'.repeat(60), C.dim));
        for (const { pattern, domains } of repeatedPatterns) {
            console.log(colour(`  Domains: ${domains.join(', ')}`, C.dim));
            console.log(`  Pattern: ${colour(pattern, C.yellow)}`);
            console.log(colour('  Suggestion: Extract to shared/ helper or trait', C.dim));
            console.log();
        }
    }

    // ── Summary ────────────────────────────────────────────────────────────────
    const totalFindings = fileResults.reduce((s, r) => s + r.findings.length, 0);
    console.log(colour('═'.repeat(60), C.dim));
    console.log(colour('📈 SUMMARY', C.bold));
    console.log(`  Total files analysed : ${rustFiles.length + tsFiles.length}`);
    console.log(`  Files with findings  : ${fileResults.length}`);
    console.log(`  Total findings       : ${totalFindings}`);
    console.log(`  High-risk files      : ${colour(String(highRisk.length), C.red)}`);
    console.log(`  Medium-risk files    : ${colour(String(mediumRisk.length), C.yellow)}`);
    console.log(`  Low-risk files       : ${colour(String(lowRisk.length), C.green)}`);

    // ── Save JSON report ───────────────────────────────────────────────────────
    const reportPath = path.join(CONFIG.projectRoot, 'maintainability-report.json');
    const report = {
        generatedAt: new Date().toISOString(),
        summary: {
            filesAnalysed: rustFiles.length + tsFiles.length,
            filesWithFindings: fileResults.length,
            totalFindings,
            highRiskCount: highRisk.length,
            mediumRiskCount: mediumRisk.length,
            lowRiskCount: lowRisk.length,
        },
        highRiskFiles: highRisk.map(r => ({ file: r.file, riskScore: r.riskScore, findings: r.findings })),
        mediumRiskFiles: mediumRisk.map(r => ({ file: r.file, riskScore: r.riskScore, findings: r.findings })),
        lowRiskFiles: lowRisk.map(r => ({ file: r.file, riskScore: r.riskScore, findings: r.findings })),
        repeatedPatterns,
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n  Report saved → ${colour(relPath(reportPath), C.cyan)}`);
    console.log(colour('═'.repeat(60), C.dim));

    // Exit non-zero when high-risk files are found in strict mode (CI regression gate)
    if (highRisk.length > 0) {
        console.log(colour('\n⚠️  High-risk maintainability issues detected. See report for refactor hints.', C.red));
        if (strict) process.exit(1);
    } else {
        console.log(colour('\n✅ No high-risk maintainability issues detected.', C.green));
    }
}

function printRiskGroup(title, items, titleColour) {
    if (items.length === 0) return;
    console.log(colour(`\n${title}`, C.bold, titleColour));
    console.log(colour('─'.repeat(60), C.dim));

    for (const { file, riskScore, findings } of items) {
        console.log(colour(`\n  📄 ${file}`, C.bold) + colour(` [risk: ${riskScore}/10]`, titleColour));
        for (const f of findings) {
            const icon = f.type === 'deep-nesting' ? '🌀'
                : f.type === 'fat-react-component' ? '⚛️ '
                : f.type === 'fat-ipc-handler' ? '🔌'
                : f.type === 'fat-application-service' ? '⚙️ '
                : f.type === 'repeated-pattern' ? '🔁'
                : '📏';
            console.log(`    ${icon}  Line ${f.line}: ${colour(f.message, titleColour)}`);
            console.log(colour(`       💡 ${f.suggestion}`, C.dim));
            if (f.patchHint) {
                const hintLines = f.patchHint.split('\n');
                for (const hl of hintLines) {
                    console.log(colour(`       ${hl}`, C.dim));
                }
            }
        }
    }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

if (require.main === module) {
    const strict = process.argv.includes('--strict');
    runAudit({ strict });
}

module.exports = { runAudit, analyseRustFile, analyseTsFile, detectRepeatedPatterns, computeRiskScore };
