#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MTIME_TOLERANCE_MS = 1;

function parseArgs(argv) {
  const args = {
    root: null,
    staged: false,
    stampFile: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root' && argv[i + 1]) {
      args.root = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }

    if (argv[i] === '--stamp-file' && argv[i + 1]) {
      args.stampFile = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }

    if (argv[i] === '--staged') {
      args.staged = true;
    }
  }

  return args;
}

function resolveRootDir(args) {
  if (args.root) return args.root;
  if (process.env.RPMA_ROOT_DIR) return path.resolve(process.env.RPMA_ROOT_DIR);
  return path.resolve(__dirname, '..');
}

function resolveStampFile(args, rootDir) {
  if (args.stampFile) return args.stampFile;
  return path.join(rootDir, '.git', 'types-sync-stamp');
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function relativePath(rootDir, absolutePath) {
  return normalizePath(path.relative(rootDir, absolutePath));
}

function listFilesRecursively(rootDir) {
  const files = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'target' || entry.name === '.next') {
        continue;
      }

      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function gitPaths(rootDir, args) {
  const commandArgs = args.staged
    ? ['diff', '--cached', '--name-only', '--diff-filter=ACMRD']
    : ['status', '--porcelain'];

  const stdout = execFileSync('git', commandArgs, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (args.staged) {
    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((filePath) => normalizePath(filePath));
  }

  return stdout
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const candidate = line.slice(3);
      const renamedParts = candidate.split(' -> ');
      return normalizePath(renamedParts[renamedParts.length - 1].trim());
    })
    .filter(Boolean);
}

function getCandidateFiles(rootDir, args) {
  if (!args.staged) {
    return listFilesRecursively(rootDir);
  }

  return gitPaths(rootDir, args)
    .map((relPath) => path.join(rootDir, relPath))
    .filter((absolutePath) => fs.existsSync(absolutePath));
}

function countMatches(value, regex) {
  return (value.match(regex) || []).length;
}

function stripBlockComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

function stripLineComments(line) {
  return line.replace(/\/\/.*$/, '');
}

function isTestAttribute(line) {
  return /^\s*#\s*\[\s*(?:tokio::)?test\b/.test(line);
}

function isCfgTestAttribute(line) {
  return /^\s*#\s*\[\s*cfg\s*\((?:[^)]*\btest\b[^)]*)\)\s*\]/.test(line);
}

function findNonTestUnwrapExpect(content, relPath) {
  if (relPath.includes('/tests/') || relPath.endsWith('/tests.rs')) {
    return [];
  }

  const source = stripBlockComments(content);
  const lines = source.split(/\r?\n/);
  const violations = [];
  const ignoredDepths = [];
  let braceDepth = 0;
  let pendingIgnoredItem = false;

  for (let index = 0; index < lines.length; index += 1) {
    const originalLine = lines[index];
    const line = stripLineComments(originalLine);

    if (isCfgTestAttribute(line) || isTestAttribute(line)) {
      pendingIgnoredItem = true;
    }

    const insideIgnoredItem = ignoredDepths.length > 0;
    const opens = countMatches(line, /{/g);
    const closes = countMatches(line, /}/g);

    if (!insideIgnoredItem && !pendingIgnoredItem && /\b(?:unwrap|expect)\s*\(/.test(line)) {
      violations.push({
        line: index + 1,
        snippet: originalLine.trim(),
      });
    }

    if (pendingIgnoredItem && opens > 0) {
      ignoredDepths.push(braceDepth + 1);
      pendingIgnoredItem = false;
    } else if (pendingIgnoredItem && /;\s*$/.test(line)) {
      pendingIgnoredItem = false;
    }

    braceDepth += opens - closes;

    while (ignoredDepths.length > 0 && braceDepth < ignoredDepths[ignoredDepths.length - 1]) {
      ignoredDepths.pop();
    }
  }

  return violations;
}

function readFile(absolutePath) {
  return fs.readFileSync(absolutePath, 'utf8');
}

function matchesAny(relativeFile, patterns) {
  return patterns.some((pattern) => pattern.test(relativeFile));
}

function checkAdr001(rootDir, files) {
  const violations = [];

  for (const absolutePath of files) {
    const relPath = relativePath(rootDir, absolutePath);
    if (!/^src-tauri\/src\/domains\/[^/]+\/ipc\/.*\.rs$/.test(relPath)) {
      continue;
    }

    const content = readFile(absolutePath);
    if (!content.includes('#[tauri::command]')) {
      continue;
    }

    if (!content.includes('resolve_context!')) {
      violations.push(relPath);
    }
  }

  return violations;
}

function checkAdr013(rootDir, files) {
  const violations = [];

  for (const absolutePath of files) {
    const relPath = relativePath(rootDir, absolutePath);
    if (!/^frontend\/src\/domains\/.*\.(ts|tsx)$/.test(relPath)) {
      continue;
    }

    const content = readFile(absolutePath);
    if (/\binvoke\s*\(/.test(content)) {
      violations.push(relPath);
    }
  }

  return violations;
}

function checkAdr014(rootDir, files) {
  const violations = [];

  for (const absolutePath of files) {
    const relPath = relativePath(rootDir, absolutePath);
    if (!/^frontend\/src\/domains\/.*\.(ts|tsx)$/.test(relPath)) {
      continue;
    }

    const content = readFile(absolutePath);
    if (/\buseEffect\b/.test(content) && /\bipc\./.test(content)) {
      violations.push(relPath);
    }
  }

  return violations;
}

function checkAdr019(rootDir, files) {
  const violations = [];

  for (const absolutePath of files) {
    const relPath = relativePath(rootDir, absolutePath);
    if (!/^src-tauri\/src\/.*\.rs$/.test(relPath)) {
      continue;
    }

    const fileViolations = findNonTestUnwrapExpect(readFile(absolutePath), relPath);
    for (const violation of fileViolations) {
      violations.push({
        file: relPath,
        line: violation.line,
        snippet: violation.snippet,
      });
    }
  }

  return violations;
}

function readTypesSyncTimestamp(stampFile) {
  if (!fs.existsSync(stampFile)) {
    return null;
  }

  const raw = fs.readFileSync(stampFile, 'utf8').trim();
  if (!raw) {
    return null;
  }

  const timestamp = Number(raw);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function typeCandidatePaths(rootDir, args) {
  const changedPaths = gitPaths(rootDir, args).filter((relPath) => relPath.startsWith('frontend/src/types/'));
  return [...new Set(changedPaths)];
}

function checkAdr015(rootDir, args, stampFile) {
  const violations = [];
  const changedPaths = typeCandidatePaths(rootDir, args);

  if (changedPaths.length === 0) {
    return violations;
  }

  const lastTypesSync = readTypesSyncTimestamp(stampFile);
  if (lastTypesSync === null) {
    for (const relPath of changedPaths) {
      violations.push({
        file: relPath,
        reason: 'changed without a recorded types:sync run',
      });
    }
    return violations;
  }

  for (const relPath of changedPaths) {
    const absolutePath = path.join(rootDir, relPath);

    if (!fs.existsSync(absolutePath)) {
      violations.push({
        file: relPath,
        reason: 'deleted or renamed manually inside frontend/src/types/',
      });
      continue;
    }

    const { mtimeMs } = fs.statSync(absolutePath);
    if (mtimeMs > lastTypesSync + MTIME_TOLERANCE_MS) {
      violations.push({
        file: relPath,
        reason: 'modified after the last recorded types:sync run',
      });
    }
  }

  return violations;
}

function runAdrLint(rootDir, args) {
  const files = getCandidateFiles(rootDir, args);
  const stampFile = resolveStampFile(args, rootDir);

  return {
    mode: args.staged ? 'staged' : 'full',
    adr001: checkAdr001(rootDir, files),
    adr013: checkAdr013(rootDir, files),
    adr014: checkAdr014(rootDir, files),
    adr019: checkAdr019(rootDir, files),
    adr015: checkAdr015(rootDir, args, stampFile),
    stampFile: relativePath(rootDir, stampFile),
  };
}

function printReport(result) {
  console.log(`ADR lint (${result.mode} mode)`);

  if (result.adr001.length === 0) {
    console.log('✓ ADR-001: all staged IPC command files use resolve_context!');
  } else {
    console.log(`✗ ADR-001 violations: ${result.adr001.length}`);
    for (const file of result.adr001) {
      console.log(`  - ${file}`);
    }
  }

  if (result.adr013.length === 0) {
    console.log('✓ ADR-013: no direct invoke(...) calls in frontend domains');
  } else {
    console.log(`✗ ADR-013 violations: ${result.adr013.length}`);
    for (const file of result.adr013) {
      console.log(`  - ${file}`);
    }
  }

  if (result.adr014.length === 0) {
    console.log('✓ ADR-014: no useEffect + ipc. heuristic matches in frontend domains');
  } else {
    console.log(`✗ ADR-014 heuristic violations: ${result.adr014.length}`);
    for (const file of result.adr014) {
      console.log(`  - ${file}`);
    }
  }

  if (result.adr019.length === 0) {
    console.log('✓ ADR-019: no unwrap()/expect() outside test-only Rust code');
  } else {
    console.log(`✗ ADR-019 violations: ${result.adr019.length}`);
    for (const violation of result.adr019) {
      console.log(`  - ${violation.file}:${violation.line} ${violation.snippet}`);
    }
  }

  if (result.adr015.length === 0) {
    console.log(`✓ ADR-015: no manual frontend/src/types changes after last types:sync (${result.stampFile})`);
  } else {
    console.log(`✗ ADR-015 violations: ${result.adr015.length}`);
    for (const violation of result.adr015) {
      console.log(`  - ${violation.file}: ${violation.reason}`);
    }
  }
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const rootDir = resolveRootDir(args);
    const result = runAdrLint(rootDir, args);
    printReport(result);

    const hasViolations = [
      result.adr001.length,
      result.adr013.length,
      result.adr014.length,
      result.adr019.length,
      result.adr015.length,
    ].some((count) => count > 0);

    process.exit(hasViolations ? 1 : 0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`ADR lint failed: ${message}`);
    process.exit(1);
  }
}

module.exports = {
  findNonTestUnwrapExpect,
  runAdrLint,
  parseArgs,
};
