#!/usr/bin/env node

/**
 * Bounded Context Architecture Validator
 * 
 * Validates that the bounded context architecture rules are followed:
 * 1. Each domain has a public API (api/index.ts)
 * 2. No cross-domain internal imports
 * 3. No circular dependencies
 * 4. Shared layer doesn't depend on domains
 * 5. Proper export patterns
 * 
 * Usage:
 *   node scripts/validate-bounded-contexts.js
 *   npm run validate:architecture
 */

const fs = require('fs');
const path = require('path');

// Configuration
const FRONTEND_SRC = path.join(__dirname, '../frontend/src');
const DOMAINS_DIR = path.join(FRONTEND_SRC, 'domains');
const SHARED_DIR = path.join(FRONTEND_SRC, 'shared');
const APP_DIR = path.join(FRONTEND_SRC, 'app');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Tracking
const errors = [];
const warnings = [];
let checksRun = 0;

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function section(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(title, 'cyan');
  log('='.repeat(60), 'cyan');
}

function checkExists(filePath, errorMessage) {
  if (!fs.existsSync(filePath)) {
    error(errorMessage);
    return false;
  }
  return true;
}

function getDomains() {
  if (!fs.existsSync(DOMAINS_DIR)) {
    return [];
  }
  
  return fs.readdirSync(DOMAINS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => !name.startsWith('.') && !name.startsWith('_'));
}

function getFiles(pattern) {
  try {
    // Convert glob pattern to directory and extension
    const parts = pattern.split('**');
    const baseDir = parts[0];
    const extensions = ['.ts', '.tsx'];
    
    if (!fs.existsSync(baseDir)) {
      return [];
    }
    
    const files = [];
    
    function walk(dir) {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory() && !item.name.startsWith('.')) {
          walk(fullPath);
        } else if (item.isFile()) {
          const ext = path.extname(item.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }
    
    walk(baseDir);
    return files;
  } catch (err) {
    return [];
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    return '';
  }
}

// ============================================================================
// RULE 1: Check public API exists for each domain
// ============================================================================
function validatePublicAPIs() {
  section('RULE 1: Public API Validation');
  
  const domains = getDomains();
  
  if (domains.length === 0) {
    log('  ℹ️  No domains found yet (migrations not started)', 'yellow');
    return;
  }
  
  log(`  Found ${domains.length} domains: ${domains.join(', ')}`);
  
  domains.forEach(domain => {
    checksRun++;
    const apiIndexPath = path.join(DOMAINS_DIR, domain, 'api', 'index.ts');
    const domainPath = path.join(DOMAINS_DIR, domain);
    
    if (!checkExists(apiIndexPath, 
      `❌ Domain '${domain}' missing public API: ${domain}/api/index.ts`)) {
      return;
    }
    
    // Check if api/index.ts has exports
    const content = readFile(apiIndexPath);
    if (content.trim().length === 0) {
      error(`❌ Domain '${domain}' has empty public API: ${domain}/api/index.ts`);
      return;
    }
    
    // Check for required exports
    const hasProviderExport = /export.*Provider/.test(content);
    const hasHookExport = /export.*use/.test(content);
    const hasTypeExport = /export type/.test(content);
    
    if (!hasProviderExport) {
      warn(`⚠️  Domain '${domain}' should export a Provider component`);
    }
    
    if (!hasHookExport) {
      warn(`⚠️  Domain '${domain}' should export at least one hook`);
    }
    
    if (!hasTypeExport) {
      warn(`⚠️  Domain '${domain}' should export types`);
    }
    
    log(`  ✅ Domain '${domain}' has valid public API`, 'green');
  });
}

// ============================================================================
// RULE 2: Check no cross-domain internal imports
// ============================================================================
function validateNoInternalImports() {
  section('RULE 2: No Cross-Domain Internal Imports');
  
  const domains = getDomains();
  
  if (domains.length === 0) {
    log('  ℹ️  Skipping (no domains yet)', 'yellow');
    return;
  }
  
  // Check domain files
  domains.forEach(domain => {
    const domainFiles = getFiles(`${DOMAINS_DIR}/${domain}/**/*.{ts,tsx}`);
    
    domainFiles.forEach(file => {
      // Skip the public API files themselves
      if (file.includes('/api/index.ts')) return;
      
      checksRun++;
      const content = readFile(file);
      const relativePath = path.relative(FRONTEND_SRC, file);
      
      // Pattern 1: Importing from another domain's internal modules
      // e.g., @/domains/tasks/services/...
      const internalImportPattern = /@\/domains\/(\w+)\/(services|ipc|hooks|components)/g;
      let match;
      
      while ((match = internalImportPattern.exec(content)) !== null) {
        const importedDomain = match[1];
        const importedModule = match[2];
        
        // Allow importing from own domain's internal modules
        if (!file.includes(`/domains/${importedDomain}/`)) {
          error(
            `❌ ${relativePath}\n` +
            `   Importing internal module: @/domains/${importedDomain}/${importedModule}\n` +
            `   Use public API instead: @/domains/${importedDomain}`
          );
        }
      }
      
      // Pattern 2: Relative imports going outside domain
      // e.g., ../../../other-domain/services/...
      const relativeImportPattern = /from ['"]\.\.\/\.\.\/\.\.\/(\w+)\/(services|ipc|hooks)/g;
      
      while ((match = relativeImportPattern.exec(content)) !== null) {
        error(
          `❌ ${relativePath}\n` +
          `   Deep relative import detected: ${match[0]}\n` +
          `   Use path aliases instead: @/domains/${match[1]}`
        );
      }
    });
  });
  
  // Check app files
  const appFiles = getFiles(`${APP_DIR}/**/*.{ts,tsx}`);
  appFiles.forEach(file => {
    checksRun++;
    const content = readFile(file);
    const relativePath = path.relative(FRONTEND_SRC, file);
    
    // App should only import from @/domains/{name}, not internal modules
    const internalImportPattern = /@\/domains\/\w+\/(services|ipc|hooks|components)/g;
    let match;
    
    while ((match = internalImportPattern.exec(content)) !== null) {
      error(
        `❌ ${relativePath}\n` +
        `   App importing internal domain module: ${match[0]}\n` +
        `   Use public API instead: @/domains/{name}`
      );
    }
  });
  
  if (checksRun > 0 && errors.length === 0) {
    log('  ✅ No internal imports found', 'green');
  }
}

// ============================================================================
// RULE 3: Check shared doesn't depend on domains
// ============================================================================
function validateSharedIndependence() {
  section('RULE 3: Shared Layer Independence');
  
  if (!fs.existsSync(SHARED_DIR)) {
    log('  ℹ️  Shared directory not found', 'yellow');
    return;
  }
  
  const sharedFiles = getFiles(`${SHARED_DIR}/**/*.{ts,tsx}`);
  
  if (sharedFiles.length === 0) {
    log('  ℹ️  No shared files found', 'yellow');
    return;
  }
  
  sharedFiles.forEach(file => {
    checksRun++;
    const content = readFile(file);
    const relativePath = path.relative(FRONTEND_SRC, file);
    
    // Check for domain imports (both path alias and relative)
    if (content.includes('@/domains/') || content.includes('../domains/')) {
      const domainImportPattern = /@\/domains\/(\w+)|\.\.\/domains\/(\w+)/g;
      let match;
      
      while ((match = domainImportPattern.exec(content)) !== null) {
        const domain = match[1] || match[2];
        error(
          `❌ ${relativePath}\n` +
          `   Shared layer importing from domain: ${domain}\n` +
          `   Shared layer must not depend on domains`
        );
      }
    }
  });
  
  if (checksRun > 0 && errors.filter(e => e.includes('Shared layer')).length === 0) {
    log('  ✅ Shared layer is independent', 'green');
  }
}

// ============================================================================
// RULE 4: Check circular dependencies
// ============================================================================
function validateNoCircularDeps() {
  section('RULE 4: No Circular Dependencies');
  
  const domains = getDomains();
  
  if (domains.length < 2) {
    log('  ℹ️  Need at least 2 domains to check circular dependencies', 'yellow');
    return;
  }
  
  // Build dependency graph
  const dependencyGraph = {};
  
  domains.forEach(domain => {
    dependencyGraph[domain] = new Set();
    const domainFiles = getFiles(`${DOMAINS_DIR}/${domain}/**/*.{ts,tsx}`);
    
    domainFiles.forEach(file => {
      const content = readFile(file);
      
      // Find imports from other domains
      const importPattern = /@\/domains\/(\w+)/g;
      let match;
      
      while ((match = importPattern.exec(content)) !== null) {
        const importedDomain = match[1];
        if (importedDomain !== domain) {
          dependencyGraph[domain].add(importedDomain);
        }
      }
    });
  });
  
  // Check for cycles using DFS
  function hasCycle(node, visited = new Set(), stack = new Set()) {
    if (stack.has(node)) {
      return Array.from(stack).concat(node);
    }
    
    if (visited.has(node)) {
      return null;
    }
    
    visited.add(node);
    stack.add(node);
    
    const dependencies = dependencyGraph[node] || new Set();
    for (const dep of dependencies) {
      const cycle = hasCycle(dep, visited, stack);
      if (cycle) {
        return cycle;
      }
    }
    
    stack.delete(node);
    return null;
  }
  
  const visited = new Set();
  for (const domain of domains) {
    if (!visited.has(domain)) {
      const cycle = hasCycle(domain);
      if (cycle) {
        error(
          `❌ Circular dependency detected:\n` +
          `   ${cycle.join(' → ')}`
        );
      }
    }
  }
  
  checksRun++;
  
  if (errors.filter(e => e.includes('Circular dependency')).length === 0) {
    log('  ✅ No circular dependencies found', 'green');
  }
}

// ============================================================================
// RULE 5: Check proper TypeScript path aliases
// ============================================================================
function validatePathAliases() {
  section('RULE 5: TypeScript Path Aliases');
  
  const tsconfigPath = path.join(__dirname, '../tsconfig.json');
  
  if (!checkExists(tsconfigPath, '❌ tsconfig.json not found')) {
    return;
  }
  
  const tsconfig = JSON.parse(readFile(tsconfigPath));
  const paths = tsconfig.compilerOptions?.paths || {};
  
  const domains = getDomains();
  
  domains.forEach(domain => {
    checksRun++;
    const aliasKey = `@/domains/${domain}`;
    const expectedValue = `./src/domains/${domain}/api`;
    
    if (!paths[aliasKey]) {
      warn(
        `⚠️  Missing TypeScript path alias for domain '${domain}'\n` +
        `   Add to tsconfig.json: "${aliasKey}": ["${expectedValue}"]`
      );
    } else {
      const configuredPath = paths[aliasKey][0];
      if (!configuredPath.endsWith('/api')) {
        error(
          `❌ Path alias for '${domain}' should point to /api directory\n` +
          `   Current: "${configuredPath}"\n` +
          `   Expected: "${expectedValue}"`
        );
      } else {
        log(`  ✅ Path alias configured for '${domain}'`, 'green');
      }
    }
  });
  
  // Check for shared aliases
  if (paths['@/shared/*']) {
    log('  ✅ Shared path alias configured', 'green');
  } else {
    warn('⚠️  Missing @/shared/* path alias');
  }
}

// ============================================================================
// RULE 6: Check domain structure
// ============================================================================
function validateDomainStructure() {
  section('RULE 6: Domain Structure Validation');
  
  const domains = getDomains();
  
  if (domains.length === 0) {
    log('  ℹ️  No domains to validate', 'yellow');
    return;
  }
  
  const requiredDirs = ['api', 'components', '__tests__'];
  const optionalDirs = ['hooks', 'services', 'ipc', 'utils'];
  
  domains.forEach(domain => {
    const domainPath = path.join(DOMAINS_DIR, domain);
    
    // Check required directories
    requiredDirs.forEach(dir => {
      checksRun++;
      const dirPath = path.join(domainPath, dir);
      if (!fs.existsSync(dirPath)) {
        error(`❌ Domain '${domain}' missing required directory: ${dir}/`);
      }
    });
    
    // Check for README
    checksRun++;
    const readmePath = path.join(domainPath, 'README.md');
    if (!fs.existsSync(readmePath)) {
      warn(`⚠️  Domain '${domain}' missing README.md`);
    }
    
    // Check api/index.ts exists and has content
    const apiIndexPath = path.join(domainPath, 'api', 'index.ts');
    if (fs.existsSync(apiIndexPath)) {
      const content = readFile(apiIndexPath);
      if (content.includes('export') && content.length > 100) {
        log(`  ✅ Domain '${domain}' structure valid`, 'green');
      }
    }
  });
}

// ============================================================================
// Main execution
// ============================================================================
function main() {
  log('\n🔍 Bounded Context Architecture Validator', 'blue');
  log('==========================================\n', 'blue');
  
  const startTime = Date.now();
  
  // Run all validations
  validatePublicAPIs();
  validateNoInternalImports();
  validateSharedIndependence();
  validateNoCircularDeps();
  validatePathAliases();
  validateDomainStructure();
  
  // Summary
  section('SUMMARY');
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  log(`\n  Checks run: ${checksRun}`, 'cyan');
  log(`  Duration: ${duration}s`, 'cyan');
  
  if (errors.length > 0) {
    log(`\n  ❌ ${errors.length} error(s) found:`, 'red');
    errors.forEach(err => log(`\n${err}`, 'red'));
  }
  
  if (warnings.length > 0) {
    log(`\n  ⚠️  ${warnings.length} warning(s):`, 'yellow');
    warnings.forEach(warn => log(`\n${warn}`, 'yellow'));
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    log('\n  ✅ All architecture rules passed!', 'green');
    log('\n  🎉 Your bounded context architecture is valid!\n', 'green');
    process.exit(0);
  } else if (errors.length === 0) {
    log('\n  ✅ No errors found (warnings only)', 'green');
    log('  Consider addressing warnings before merging\n', 'yellow');
    process.exit(0);
  } else {
    log('\n  ❌ Architecture validation failed!', 'red');
    log('  Please fix the errors above before merging\n', 'red');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validatePublicAPIs,
  validateNoInternalImports,
  validateSharedIndependence,
  validateNoCircularDeps,
  validatePathAliases,
  validateDomainStructure,
};
