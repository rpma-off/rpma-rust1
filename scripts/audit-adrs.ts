#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const VALID_CODE_EXTENSIONS = new Set([
  '.rs', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.sql', '.md', '.toml', '.json', '.yml', '.yaml',
]);

function parseArgs(argv) {
  const args = { root: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root' && argv[i + 1]) {
      args.root = path.resolve(argv[i + 1]);
      i += 1;
    }
  }
  return args;
}

function resolveRootDir(args) {
  if (args.root) return args.root;
  if (process.env.RPMA_ROOT_DIR) return path.resolve(process.env.RPMA_ROOT_DIR);
  return path.resolve(__dirname, '..');
}

function findAdrDir(rootDir) {
  const preferred = path.join(rootDir, 'docs', 'adrs');
  const fallback = path.join(rootDir, 'docs', 'adr');

  if (fs.existsSync(preferred)) return preferred;
  if (fs.existsSync(fallback)) return fallback;

  throw new Error('Could not find ADR directory (expected docs/adrs or docs/adr)');
}

function listFilesRecursively(rootDir) {
  const files = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'target') {
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

function normalizeReference(reference) {
  let normalized = reference.trim();
  normalized = normalized.replace(/^`|`$/g, '');
  // ADR bullets in this repo use either "-" or "—" separators after path references.
  normalized = normalized.replace(/\s+[—-]\s+.*$/, '');
  normalized = normalized.replace(/:[0-9,-]+$/, '');
  normalized = normalized.replace(/\/$/, '/');
  return normalized;
}

function extractRelatedReferences(content) {
  const sectionMatch = content.match(/##\s+Related Files\s*\n([\s\S]*?)(\n##\s+|$)/i);
  if (!sectionMatch) {
    return { hasRelatedFilesSection: false, references: [] };
  }

  const sectionBody = sectionMatch[1];
  const references = [];

  for (const line of sectionBody.split('\n')) {
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (!bulletMatch) continue;

    const bullet = bulletMatch[1];
    const codeSpans = [...bullet.matchAll(/`([^`]+)`/g)].map((match) => match[1].trim());

    if (codeSpans.length > 0) {
      for (const codeRef of codeSpans) {
        references.push(normalizeReference(codeRef));
      }
      continue;
    }

    const firstToken = bullet.split(/\s+/)[0];
    if (firstToken.includes('/') || firstToken.includes('.')) {
      references.push(normalizeReference(firstToken));
    }
  }

  return {
    hasRelatedFilesSection: true,
    references: [...new Set(references.filter(Boolean))],
  };
}

function isPattern(reference) {
  return /[*?{}]/.test(reference) || reference.endsWith('/');
}

function escapeRegex(value) {
  return value.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

function globToRegex(globPattern) {
  const normalized = globPattern.replace(/\\/g, '/');
  let regex = '^';

  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];

    if (ch === '*') {
      const next = normalized[i + 1];
      if (next === '*') {
        regex += '.*';
        i += 1;
      } else {
        regex += '[^/]*';
      }
      continue;
    }

    if (ch === '?') {
      regex += '[^/]';
      continue;
    }

    regex += escapeRegex(ch);
  }

  regex += '$';
  return new RegExp(regex);
}

function resolveMatches(reference, rootDir, allFiles) {
  const normalizedRef = reference.replace(/^\.\//, '');

  if (!isPattern(normalizedRef)) {
    const absolutePath = path.join(rootDir, normalizedRef);
    return fs.existsSync(absolutePath) ? [absolutePath] : [];
  }

  // Treat directory references like `path/to/dir/` as "all files under this directory".
  const pattern = normalizedRef.endsWith('/') ? `${normalizedRef}**` : normalizedRef;
  const regex = globToRegex(pattern);

  return allFiles.filter((absolutePath) => {
    const relativePath = path.relative(rootDir, absolutePath).replace(/\\/g, '/');
    return regex.test(relativePath);
  });
}

function seemsLikeCodeFile(reference, absolutePath) {
  if (reference.endsWith('/')) return true;
  const ext = path.extname(absolutePath).toLowerCase();
  return VALID_CODE_EXTENSIONS.has(ext);
}

function getAdrIdFromFilename(fileName) {
  const match = fileName.match(/^(\d+)-/);
  if (!match) return null;
  return `ADR-${match[1].padStart(3, '0')}`;
}

function auditAdrs(rootDir) {
  const adrDir = findAdrDir(rootDir);
  const allFiles = listFilesRecursively(rootDir);
  const adrFiles = fs.readdirSync(adrDir)
    .filter((name) => /^\d+-.*\.md$/i.test(name))
    .sort();

  const missingSections = [];
  const staleReferences = [];
  const undocumentedPatternMatches = [];

  for (const adrFile of adrFiles) {
    const adrPath = path.join(adrDir, adrFile);
    const adrContent = fs.readFileSync(adrPath, 'utf8');
    const { hasRelatedFilesSection, references } = extractRelatedReferences(adrContent);
    const adrId = getAdrIdFromFilename(adrFile);

    if (!hasRelatedFilesSection) {
      missingSections.push({ adr: adrFile });
      continue;
    }

    for (const reference of references) {
      const matches = resolveMatches(reference, rootDir, allFiles);

      if (matches.length === 0) {
        staleReferences.push({ adr: adrFile, reference });
        continue;
      }

      if (!isPattern(reference) || !adrId) {
        continue;
      }

      for (const matchPath of matches) {
        if (!seemsLikeCodeFile(reference, matchPath)) {
          continue;
        }

        const fileContent = fs.readFileSync(matchPath, 'utf8');
        if (!fileContent.includes(adrId)) {
          undocumentedPatternMatches.push({
            adr: adrFile,
            adrId,
            pattern: reference,
            file: path.relative(rootDir, matchPath).replace(/\\/g, '/'),
          });
        }
      }
    }
  }

  return {
    adrDir: path.relative(rootDir, adrDir).replace(/\\/g, '/'),
    adrFilesCount: adrFiles.length,
    missingSections,
    staleReferences,
    undocumentedPatternMatches,
  };
}

function printReport(result) {
  console.log('ADR audit');
  console.log(`- ADR directory: ${result.adrDir}`);
  console.log(`- ADR files scanned: ${result.adrFilesCount}`);

  if (result.missingSections.length === 0) {
    console.log('✓ All ADRs have a Related Files section');
  } else {
    console.log(`✗ ADRs missing Related Files section: ${result.missingSections.length}`);
    for (const issue of result.missingSections) {
      console.log(`  - ${issue.adr}`);
    }
  }

  if (result.staleReferences.length === 0) {
    console.log('✓ No stale file references found in ADRs');
  } else {
    console.log(`✗ Stale file references: ${result.staleReferences.length}`);
    for (const issue of result.staleReferences) {
      console.log(`  - ${issue.adr}: ${issue.reference}`);
    }
  }

  if (result.undocumentedPatternMatches.length === 0) {
    console.log('✓ No undocumented pattern matches found');
  } else {
    console.log(`✗ Undocumented pattern matches: ${result.undocumentedPatternMatches.length}`);
    for (const issue of result.undocumentedPatternMatches) {
      console.log(`  - ${issue.file} matches ${issue.pattern} from ${issue.adr} but lacks ${issue.adrId} reference`);
    }
  }
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const rootDir = resolveRootDir(args);
    const result = auditAdrs(rootDir);
    printReport(result);

    const hasIssues =
      result.missingSections.length > 0 ||
      result.staleReferences.length > 0 ||
      result.undocumentedPatternMatches.length > 0;

    process.exit(hasIssues ? 1 : 0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`ADR audit failed: ${message}`);
    process.exit(1);
  }
}

module.exports = {
  auditAdrs,
  extractRelatedReferences,
  resolveMatches,
  globToRegex,
};
