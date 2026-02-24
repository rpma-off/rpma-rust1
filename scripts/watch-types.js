#!/usr/bin/env node

/**
 * Watch mode for type generation.
 * Watches Rust source files in src-tauri/src/domains/ and src-tauri/src/commands/
 * for changes, then re-runs the type generation pipeline.
 *
 * Uses Node.js built-in fs.watch with debouncing — no external dependencies.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const WATCH_DIRS = [
  path.join(ROOT, 'src-tauri', 'src', 'domains'),
  path.join(ROOT, 'src-tauri', 'src', 'commands'),
  path.join(ROOT, 'src-tauri', 'src', 'models'),
  path.join(ROOT, 'src-tauri', 'src', 'shared'),
];

const DEBOUNCE_MS = 1500;
let debounceTimer = null;
let isRunning = false;

function runTypesSync() {
  if (isRunning) {
    console.log('⏳ Type generation already in progress, skipping...');
    return;
  }
  isRunning = true;
  console.log(`\n🔄 [${new Date().toLocaleTimeString()}] Rust source changed — regenerating types...`);
  try {
    execSync('npm run types:sync', { cwd: ROOT, stdio: 'inherit' });
    console.log(`✅ [${new Date().toLocaleTimeString()}] Types regenerated successfully.`);
  } catch (error) {
    console.error(`❌ [${new Date().toLocaleTimeString()}] Type generation failed.`);
  } finally {
    isRunning = false;
  }
}

function scheduleRun() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runTypesSync, DEBOUNCE_MS);
}

/**
 * Recursively watch a directory for .rs file changes.
 */
function watchDir(dir) {
  if (!fs.existsSync(dir)) return;

  try {
    fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (filename && filename.endsWith('.rs')) {
        console.log(`📝 Changed: ${filename}`);
        scheduleRun();
      }
    });
  } catch (err) {
    // fs.watch with recursive may not work on all platforms; fall back to polling
    console.warn(`⚠️  fs.watch recursive not supported for ${dir}, using polling fallback`);
    pollDir(dir);
  }
}

/**
 * Polling fallback: scan for .rs file modification times.
 */
function pollDir(dir) {
  const mtimes = {};

  function scanMtimes(d) {
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'target') {
          scanMtimes(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.rs')) {
          mtimes[fullPath] = fs.statSync(fullPath).mtimeMs;
        }
      }
    } catch { /* ignore permission errors */ }
  }

  // Initial scan
  scanMtimes(dir);

  setInterval(() => {
    const oldMtimes = { ...mtimes };
    scanMtimes(dir);

    let changed = false;
    for (const [file, mtime] of Object.entries(mtimes)) {
      if (oldMtimes[file] !== mtime) {
        console.log(`📝 Changed: ${path.relative(ROOT, file)}`);
        changed = true;
      }
    }
    if (changed) scheduleRun();
  }, 2000);
}

// Main
console.log('👀 Watching Rust sources for type changes...');
console.log(`   Directories: ${WATCH_DIRS.map(d => path.relative(ROOT, d)).join(', ')}`);
console.log(`   Debounce: ${DEBOUNCE_MS}ms`);
console.log('   Press Ctrl+C to stop.\n');

for (const dir of WATCH_DIRS) {
  watchDir(dir);
}

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n👋 Stopped watching.');
  process.exit(0);
});
