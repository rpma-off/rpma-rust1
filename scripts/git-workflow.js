#!/usr/bin/env node

const { spawnSync } = require('child_process');

function runGit(args, options = {}) {
  const result = spawnSync('git', args, {
    stdio: options.capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    if (options.capture && result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(result.status || 1);
  }

  return (result.stdout || '').trim();
}

function getCurrentBranch() {
  return runGit(['branch', '--show-current'], { capture: true });
}

function ensureRepo() {
  runGit(['rev-parse', '--is-inside-work-tree'], { capture: true });
}

function ensureNoMergeInProgress() {
  const mergeHead = spawnSync('git', ['rev-parse', '-q', '--verify', 'MERGE_HEAD'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  if (mergeHead.status === 0) {
    console.error('A merge is in progress. Complete it before running this command.');
    process.exit(1);
  }
}

function hasUncommittedChanges() {
  const status = runGit(['status', '--porcelain'], { capture: true });
  return status.length > 0;
}

function sanitizeBranchName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    console.error('Missing feature name. Example: npm run git:start-feature -- task-encoding-fix');
    process.exit(1);
  }
  if (/[\s~^:?*[\]\\]/.test(trimmed)) {
    console.error(`Invalid branch name "${trimmed}".`);
    process.exit(1);
  }
  if (trimmed.includes('/')) {
    return trimmed;
  }
  return `feat/${trimmed}`;
}

function startFeature(rawName, base = 'main') {
  ensureRepo();
  ensureNoMergeInProgress();
  if (hasUncommittedChanges()) {
    console.error('Working tree is not clean. Commit or stash changes first.');
    process.exit(1);
  }

  const branch = sanitizeBranchName(rawName);
  console.log(`Syncing ${base}...`);
  runGit(['fetch', 'origin']);
  runGit(['checkout', base]);
  runGit(['pull', '--rebase', 'origin', base]);

  console.log(`Creating branch ${branch}...`);
  runGit(['checkout', '-b', branch]);
  console.log(`Ready: ${branch}`);
}

function syncFeature(base = 'main') {
  ensureRepo();
  ensureNoMergeInProgress();
  const branch = getCurrentBranch();
  if (!branch) {
    console.error('Cannot detect current branch.');
    process.exit(1);
  }
  if (branch === base) {
    console.error(`You are on ${base}. Switch to a feature branch first.`);
    process.exit(1);
  }

  console.log(`Rebasing ${branch} on origin/${base}...`);
  runGit(['fetch', 'origin']);
  runGit(['rebase', `origin/${base}`]);
  console.log('Rebase complete.');
}

function finishFeature() {
  ensureRepo();
  ensureNoMergeInProgress();
  const branch = getCurrentBranch();
  if (!branch) {
    console.error('Cannot detect current branch.');
    process.exit(1);
  }
  if (branch === 'main') {
    console.error('Refusing to run on main. Switch to a feature branch.');
    process.exit(1);
  }

  console.log(`Pushing ${branch}...`);
  runGit(['push', '-u', 'origin', branch]);
  console.log('Push complete. Open/merge your PR, then run git:cleanup-feature.');
}

function cleanupFeature(branchArg, base = 'main') {
  ensureRepo();
  ensureNoMergeInProgress();
  if (hasUncommittedChanges()) {
    console.error('Working tree is not clean. Commit or stash changes first.');
    process.exit(1);
  }

  const current = getCurrentBranch();
  const branchToDelete = branchArg || (current !== base ? current : '');
  if (!branchToDelete || branchToDelete === base) {
    console.error('Provide a feature branch to delete, e.g. npm run git:cleanup-feature -- feat/my-branch');
    process.exit(1);
  }

  console.log(`Updating ${base}...`);
  runGit(['checkout', base]);
  runGit(['pull', '--rebase', 'origin', base]);

  console.log(`Deleting local branch ${branchToDelete}...`);
  runGit(['branch', '-d', branchToDelete]);
  console.log('Cleanup complete.');
}

function guardMainPush() {
  ensureRepo();
  const branch = getCurrentBranch();
  if (branch !== 'main') {
    console.log(`Branch ${branch}: push allowed.`);
    return;
  }

  runGit(['fetch', 'origin']);
  const local = runGit(['rev-parse', 'main'], { capture: true });
  const remote = runGit(['rev-parse', 'origin/main'], { capture: true });
  const base = runGit(['merge-base', 'main', 'origin/main'], { capture: true });

  if (local === remote) {
    console.log('main is up to date with origin/main.');
    return;
  }

  if (local === base) {
    console.error('Local main is behind origin/main. Pull/rebase before pushing.');
    process.exit(1);
  }

  if (remote === base) {
    console.error('Direct push from local main is blocked. Use a feature branch + PR.');
    process.exit(1);
  }

  console.error('Local and remote main have diverged. Resolve with pull --rebase first.');
  process.exit(1);
}

const [, , command, ...args] = process.argv;

switch (command) {
  case 'start-feature':
    startFeature(args[0], args[1] || 'main');
    break;
  case 'sync-feature':
    syncFeature(args[0] || 'main');
    break;
  case 'finish-feature':
    finishFeature();
    break;
  case 'cleanup-feature':
    cleanupFeature(args[0], args[1] || 'main');
    break;
  case 'guard-main':
    guardMainPush();
    break;
  default:
    console.log('Usage:');
    console.log('  node scripts/git-workflow.js start-feature <name> [base]');
    console.log('  node scripts/git-workflow.js sync-feature [base]');
    console.log('  node scripts/git-workflow.js finish-feature');
    console.log('  node scripts/git-workflow.js cleanup-feature [branch] [base]');
    console.log('  node scripts/git-workflow.js guard-main');
    process.exit(command ? 1 : 0);
}
