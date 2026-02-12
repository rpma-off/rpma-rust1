#!/usr/bin/env node

/**
 * CI Type Drift Check Script
 *
 * This script is designed for CI/CD environments and provides strict type drift detection.
 * It fails the build if there are any high-severity issues or if generated types are out of sync.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  rustSourceDir: 'src-tauri/src',
  generatedTypesFile: 'frontend/src/lib/backend.ts',
  tempDir: 'tmp',
  ciMode: process.env.CI === 'true'
};

/**
 * Generate fresh types from Rust
 */
function generateFreshTypes() {
  console.log('🔄 Generating fresh types from Rust...');

  try {
    // Create temp directory
    if (!fs.existsSync(CONFIG.tempDir)) {
      fs.mkdirSync(CONFIG.tempDir);
    }

    // Run type generation
    const command = 'cd src-tauri && cargo run --bin export-types';
    const output = execSync(command, { encoding: 'utf8' });

    // Write to temp file
    const tempTypesFile = path.join(CONFIG.tempDir, 'backend.ts');
    fs.writeFileSync(tempTypesFile, output);

    return tempTypesFile;
  } catch (error) {
    console.error('❌ Failed to generate types:', error.message);
    throw error;
  }
}

/**
 * Compare generated types with current types
 */
function compareTypes(currentFile, freshFile) {
  console.log('🔍 Comparing type files...');

  const current = fs.readFileSync(currentFile, 'utf8');
  const fresh = fs.readFileSync(freshFile, 'utf8');

  if (current === fresh) {
    console.log('✅ Types are in sync!');
    return { inSync: true, differences: [] };
  }

  // Find differences (simplified diff)
  const currentLines = current.split('\n');
  const freshLines = fresh.split('\n');

  const differences = [];
  const maxLines = Math.max(currentLines.length, freshLines.length);

  for (let i = 0; i < maxLines; i++) {
    const currentLine = currentLines[i] || '';
    const freshLine = freshLines[i] || '';

    if (currentLine !== freshLine) {
      differences.push({
        line: i + 1,
        current: currentLine,
        fresh: freshLine
      });
    }
  }

  return { inSync: false, differences };
}

/**
 * Check for critical type drift issues
 */
function checkCriticalIssues() {
  console.log('🚨 Checking for critical type drift issues...');

  const issues = [];

  // Check if generated types file exists
  if (!fs.existsSync(CONFIG.generatedTypesFile)) {
    issues.push({
      severity: 'critical',
      message: `Generated types file does not exist: ${CONFIG.generatedTypesFile}`,
      recommendation: 'Run type generation process'
    });
    return issues;
  }

  // Check if Rust sources exist
  if (!fs.existsSync(CONFIG.rustSourceDir)) {
    issues.push({
      severity: 'critical',
      message: `Rust source directory does not exist: ${CONFIG.rustSourceDir}`,
      recommendation: 'Check repository structure'
    });
    return issues;
  }

  // Check for empty generated file
  const stats = fs.statSync(CONFIG.generatedTypesFile);
  if (stats.size === 0) {
    issues.push({
      severity: 'critical',
      message: 'Generated types file is empty',
      recommendation: 'Regenerate types from Rust'
    });
  }

  return issues;
}

/**
 * Run comprehensive type validation
 */
function runTypeValidation() {
  console.log('🔬 Running comprehensive type validation...');

  try {
    // Run TypeScript compiler check
    execSync('cd frontend && npm run type-check', { stdio: 'inherit' });
    console.log('✅ TypeScript compilation successful');
  } catch (error) {
    throw new Error(`TypeScript compilation failed: ${error.message}`);
  }
}

/**
 * Clean up temporary files
 */
function cleanup() {
  console.log('🧹 Cleaning up temporary files...');

  try {
    if (fs.existsSync(CONFIG.tempDir)) {
      fs.rmSync(CONFIG.tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn('Warning: Failed to clean up temp files:', error.message);
  }
}

/**
 * Main CI check execution
 */
async function runCiCheck() {
  console.log('🚀 Starting CI Type Drift Check...\n');

  let exitCode = 0;
  const issues = [];

  try {
    // Step 1: Check for critical issues
    const criticalIssues = checkCriticalIssues();
    issues.push(...criticalIssues);

    if (criticalIssues.length > 0) {
      console.error('❌ Critical issues found:');
      criticalIssues.forEach(issue => {
        console.error(`  - ${issue.message}`);
        console.error(`    💡 ${issue.recommendation}`);
      });
      exitCode = 1;
    } else {
      // Step 2: Generate fresh types
      const freshTypesFile = generateFreshTypes();

      // Step 3: Compare with current types
      const comparison = compareTypes(CONFIG.generatedTypesFile, freshTypesFile);

      if (!comparison.inSync) {
        console.error('❌ Type drift detected!');
        console.error(`Found ${comparison.differences.length} differences`);

        if (comparison.differences.length <= 10) {
          console.error('\nDifferences:');
          comparison.differences.slice(0, 5).forEach(diff => {
            console.error(`  Line ${diff.line}:`);
            console.error(`    Current: ${diff.current.substring(0, 100)}...`);
            console.error(`    Fresh:   ${diff.fresh.substring(0, 100)}...`);
          });

          if (comparison.differences.length > 5) {
            console.error(`  ... and ${comparison.differences.length - 5} more differences`);
          }
        }

        issues.push({
          severity: 'high',
          message: 'Generated types are out of sync with Rust source',
          recommendation: 'Run `npm run types:sync` to update generated types'
        });
        exitCode = 1;
      }

      // Step 4: Run type validation
      runTypeValidation();

      console.log('\n✅ CI Type Drift Check completed successfully!');
    }

  } catch (error) {
    console.error('❌ CI Type Drift Check failed:', error.message);
    issues.push({
      severity: 'critical',
      message: `CI check failed: ${error.message}`,
      recommendation: 'Check build logs and fix issues'
    });
    exitCode = 1;
  } finally {
    // Always cleanup
    cleanup();

    // Generate summary report
    const report = {
      timestamp: new Date().toISOString(),
      status: exitCode === 0 ? 'PASS' : 'FAIL',
      issues: issues,
      summary: {
        totalIssues: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length
      }
    };

    // Write report for CI artifacts
    fs.writeFileSync('type-drift-ci-report.json', JSON.stringify(report, null, 2));

    if (CONFIG.ciMode) {
      console.log('📄 CI Report saved to: type-drift-ci-report.json');
    }

    process.exit(exitCode);
  }
}

// Run if called directly
if (require.main === module) {
  runCiCheck();
}

module.exports = { runCiCheck, checkCriticalIssues, compareTypes };