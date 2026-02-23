#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function git(command) {
  return execSync(`git ${command}`, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

function getDiff() {
  const hasOriginMain = (() => {
    try {
      git('rev-parse --verify origin/main');
      return true;
    } catch {
      return false;
    }
  })();

  if (hasOriginMain) {
    const prDiff = git('diff --no-color --unified=0 origin/main...HEAD');
    if (prDiff) return prDiff;
  }

  return git('diff --no-color --unified=0');
}

function parseDiff(diffText) {
  if (!diffText) return [];
  const chunks = diffText.split(/^diff --git /m).filter(Boolean);

  return chunks.map((chunk) => {
    const text = `diff --git ${chunk}`;
    const fileMatch = text.match(/\+\+\+ b\/([^\n]+)/);
    const file = fileMatch ? fileMatch[1] : '';
    const addedLines = [];

    let currentLine = 0;
    const lines = text.split('\n');
    for (const line of lines) {
      const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunk) {
        currentLine = Number(hunk[1]);
        continue;
      }
      if (line.startsWith('+') && !line.startsWith('+++')) {
        addedLines.push({ line: currentLine, text: line.slice(1) });
        currentLine += 1;
      } else if (!line.startsWith('-') && !line.startsWith('\\')) {
        currentLine += 1;
      }
    }

    return { file, text, addedLines };
  });
}

function isRustDomainFile(file) {
  return file.startsWith('src-tauri/src/domains/') && file.endsWith('.rs');
}

function getDomain(file) {
  const parts = file.split('/');
  return parts[3] || '';
}

function checkViolations(fileDiffs) {
  const violations = [];

  for (const fileDiff of fileDiffs) {
    const { file, addedLines } = fileDiff;

    if (!file) continue;

    if (file === 'frontend/src/lib/backend.ts') {
      violations.push({ rule: 'Edited generated backend.ts file', file });
    }

    if (file.startsWith('frontend/') && /\.(ts|tsx|js|jsx)$/.test(file)) {
      const directTauri = addedLines.find(({ text }) =>
        /from\s+['"]@tauri-apps\/api(?:\/core)?['"]|window\.__TAURI__|\binvoke\s*\(/.test(text)
      );
      if (directTauri) {
        violations.push({
          rule: 'Frontend direct tauri calls',
          file,
          line: directTauri.line,
          detail: directTauri.text.trim(),
        });
      }
    }

    if (isRustDomainFile(file)) {
      const domain = getDomain(file);
      const crossDomain = addedLines.find(({ text }) => {
        const match = text.match(/crate::domains::([a-zA-Z0-9_]+)::/);
        return match && match[1] !== domain;
      });
      if (crossDomain) {
        violations.push({
          rule: 'Cross-domain imports detected',
          file,
          line: crossDomain.line,
          detail: crossDomain.text.trim(),
        });
      }
    }

    if (file.startsWith('src-tauri/src/') && file.endsWith('.rs') && !file.includes('/infrastructure/')) {
      const sqlLine = addedLines.find(({ text }) =>
        /\b(SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\b|rusqlite::params!/.test(text)
      );
      if (sqlLine) {
        violations.push({
          rule: 'SQL outside infrastructure layer',
          file,
          line: sqlLine.line,
          detail: sqlLine.text.trim(),
        });
      }
    }

    if (file.includes('/ipc/') && file.endsWith('.rs')) {
      const ipcLogic = addedLines.find(({ text }) =>
        /\b(begin_transaction|commit\(|rollback\(|query_|execute\(|validate|rule|policy|calculate|compute)\b/.test(text)
      );
      if (ipcLogic) {
        violations.push({
          rule: 'IPC handler contains business logic',
          file,
          line: ipcLogic.line,
          detail: ipcLogic.text.trim(),
        });
      }

      const hasCommand = addedLines.some(({ text }) => text.includes('#[tauri::command]'));
      const hasAppErrorMapping = addedLines.some(({ text }) => text.includes('AppError') || text.includes('internal_sanitized'));
      if (hasCommand && !hasAppErrorMapping) {
        violations.push({
          rule: 'Missing AppError mapping',
          file,
        });
      }
    }

    if (file.startsWith('src-tauri/src/') && file.endsWith('.rs') && !file.includes('/application/')) {
      const txOutsideApp = addedLines.find(({ text }) => /\b(begin_transaction|transaction\(|commit\(|rollback\()/.test(text));
      if (txOutsideApp) {
        violations.push({
          rule: 'Transaction not in application layer',
          file,
          line: txOutsideApp.line,
          detail: txOutsideApp.text.trim(),
        });
      }
    }

    if (file.endsWith('.rs') && fs.existsSync(path.join(repoRoot, file))) {
      const fullText = fs.readFileSync(path.join(repoRoot, file), 'utf8');
      const commitIdx = fullText.search(/\b(commit|tx\.commit)\s*\(/);
      const publishIdx = fullText.search(/\b(publish|emit_domain_event)\s*\(/);
      if (publishIdx !== -1 && commitIdx !== -1 && publishIdx < commitIdx) {
        violations.push({
          rule: 'Domain event published before commit',
          file,
        });
      }
    }

    if (file.startsWith('frontend/src/') && file.includes('/ipc/') && /\.(ts|tsx)$/.test(file)) {
      const hasInvoke = addedLines.some(({ text }) => /\binvoke(Command)?\s*\(/.test(text));
      const hasCorrelation = addedLines.some(({ text }) => /correlation(_id|Id)/.test(text));
      if (hasInvoke && !hasCorrelation) {
        violations.push({
          rule: 'Missing correlation propagation',
          file,
        });
      }
    }
  }

  return violations;
}

function main() {
  const diffText = getDiff();
  const fileDiffs = parseDiff(diffText);
  const violations = checkViolations(fileDiffs);

  if (violations.length === 0) {
    console.log('PASS');
    console.log('Violations: none');
    console.log('Patch diffs: none');
    return;
  }

  console.log('FAIL');
  console.log('Violations:');
  for (const violation of violations) {
    const suffix = violation.line ? `:${violation.line}` : '';
    const detail = violation.detail ? ` -> ${violation.detail}` : '';
    console.log(`- ${violation.rule}: ${violation.file}${suffix}${detail}`);
  }

  console.log('Patch diffs:');
  const filesWithViolations = new Set(violations.map((v) => v.file));
  for (const fileDiff of fileDiffs) {
    if (filesWithViolations.has(fileDiff.file)) {
      console.log(fileDiff.text);
    }
  }

  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseDiff,
  checkViolations,
};
