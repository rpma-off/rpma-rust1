#!/usr/bin/env node

/**
 * RPMA IPC Contract Validation Script
 *
 * Validates consistency between Rust backend IPC commands and frontend TypeScript
 * command registry. Detects:
 *
 * 1. Commands registered in Rust (generate_handler!) but missing from frontend
 * 2. Commands referenced in frontend but not registered in Rust backend
 * 3. Command naming convention inconsistencies
 * 4. Response type inconsistencies (non-standard return types)
 *
 * Usage: node scripts/validate-ipc-contracts.js
 * CI mode: node scripts/validate-ipc-contracts.js --ci
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const MAIN_RS_PATH = path.join(ROOT_DIR, 'src-tauri', 'src', 'main.rs');
const COMMANDS_TS_PATH = path.join(ROOT_DIR, 'frontend', 'src', 'lib', 'ipc', 'commands.ts');
const COMMANDS_DIR = path.join(ROOT_DIR, 'src-tauri', 'src', 'commands');

const CI_MODE = process.argv.includes('--ci');

// Commands intentionally not exposed to the frontend
// (internal/system commands, websocket server-side, debug utilities)
const KNOWN_BACKEND_ONLY = new Set([
  // Debug/test utilities
  'get_large_test_data',
  'send_log_to_frontend',
  'log_task_creation_debug',
  'log_client_creation_debug',
  // Internal sync queue operations (used by sync service, not frontend)
  'sync_enqueue',
  'sync_dequeue_batch',
  'sync_get_metrics',
  'sync_mark_completed',
  'sync_mark_failed',
  'sync_get_operation',
  'sync_cleanup_old_operations',
  // WebSocket server-side commands
  'init_websocket_server',
  'broadcast_websocket_message',
  'send_websocket_message_to_client',
  'get_websocket_stats',
  'shutdown_websocket_server',
  'broadcast_task_update',
  'broadcast_intervention_update',
  'broadcast_client_update',
  'broadcast_system_notification',
  // IPC optimization (internal transport layer)
  'compress_data_for_ipc',
  'decompress_data_from_ipc',
  'start_stream_transfer',
  'send_stream_chunk',
  'get_stream_data',
  'get_ipc_stats',
]);

// Commands in frontend planned for future backend implementation
const KNOWN_FRONTEND_ONLY = new Set([
  // Planned features not yet implemented in backend
]);

class IPCContractValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  log(message, type = 'info') {
    const colors = {
      error: '\x1b[31m',
      warning: '\x1b[33m',
      success: '\x1b[32m',
      info: '\x1b[36m',
    };
    const reset = '\x1b[0m';
    const prefix = { error: '❌', warning: '⚠️', success: '✅', info: 'ℹ️' };
    console.log(`${colors[type] || colors.info}${prefix[type] || ''} ${message}${reset}`);
  }

  extractRustCommands() {
    const content = fs.readFileSync(MAIN_RS_PATH, 'utf8');
    const match = content.match(/generate_handler!\[(.*?)\]/s);
    if (!match) {
      this.errors.push('Could not find generate_handler![] in main.rs');
      return new Set();
    }

    const block = match[1];
    // Remove single-line comments
    const cleanBlock = block.replace(/\/\/.*/g, '');
    // Extract module::function paths
    const pathMatches = cleanBlock.match(/[\w:]+::\w+/g) || [];
    const funcNames = new Set(pathMatches.map((p) => p.split('::').pop()));
    return funcNames;
  }

  extractFrontendCommands() {
    const content = fs.readFileSync(COMMANDS_TS_PATH, 'utf8');
    const matches = content.match(/'([a-z_0-9]+)'/g) || [];
    return new Set(matches.map((m) => m.replace(/'/g, '')));
  }

  checkCommandRegistration(rustCmds, frontendCmds) {
    this.log('\n📋 Command Registration Consistency', 'info');
    this.log('─'.repeat(50), 'info');

    // Commands in Rust but not in frontend
    const missingInFrontend = [...rustCmds]
      .filter((cmd) => !frontendCmds.has(cmd) && !KNOWN_BACKEND_ONLY.has(cmd))
      .sort();

    if (missingInFrontend.length > 0) {
      this.log(
        `${missingInFrontend.length} commands in Rust backend missing from frontend registry:`,
        'warning'
      );
      missingInFrontend.forEach((cmd) => {
        console.log(`    ${cmd}`);
        this.warnings.push(`Backend command '${cmd}' not in frontend IPC_COMMANDS`);
      });
    } else {
      this.log('All backend commands accounted for in frontend (or known backend-only)', 'success');
    }

    // Commands in frontend but not in Rust
    const missingInRust = [...frontendCmds]
      .filter((cmd) => !rustCmds.has(cmd) && !KNOWN_FRONTEND_ONLY.has(cmd))
      .sort();

    if (missingInRust.length > 0) {
      this.log(
        `\n${missingInRust.length} commands in frontend registry missing from Rust backend:`,
        'error'
      );
      missingInRust.forEach((cmd) => {
        console.log(`    ${cmd}`);
        this.errors.push(`Frontend command '${cmd}' not registered in Rust generate_handler![]`);
      });
    } else {
      this.log('All frontend commands have corresponding backend handlers', 'success');
    }

    return { missingInFrontend, missingInRust };
  }

  checkNamingConsistency(rustCmds) {
    this.log('\n📝 Command Naming Convention Analysis', 'info');
    this.log('─'.repeat(50), 'info');

    const allCmds = [...rustCmds].sort();

    // Categorize commands by naming pattern
    const domainPrefixed = allCmds.filter(
      (cmd) =>
        /^(auth|task|user|client|intervention|material|sync|ui|navigation|message|calendar|dashboard|analytics)_/.test(
          cmd
        )
    );
    const verbPrefixed = allCmds.filter(
      (cmd) =>
        /^(get|update|delete|create|send|export|import|search|save|cancel|check|validate|report|initialize|test|shutdown|init|log|cleanup|clear|configure|upload|revoke|resolve|acknowledge|change|broadcast|compress|decompress|start)_/.test(
          cmd
        ) && !domainPrefixed.includes(cmd)
    );
    const otherNaming = allCmds.filter(
      (cmd) => !domainPrefixed.includes(cmd) && !verbPrefixed.includes(cmd)
    );

    this.log(`Domain-prefixed commands (e.g., task_crud, material_get): ${domainPrefixed.length}`, 'info');
    this.log(`Verb-prefixed commands (e.g., get_events, create_user): ${verbPrefixed.length}`, 'info');

    if (otherNaming.length > 0) {
      this.log(`\nCommands with non-standard naming (${otherNaming.length}):`, 'warning');
      otherNaming.forEach((cmd) => {
        console.log(`    ${cmd}`);
        this.warnings.push(`Command '${cmd}' uses non-standard naming convention`);
      });
    }

    // Check for inconsistent get_ patterns
    const getWithDomain = allCmds.filter((cmd) => /_get_/.test(cmd));
    const getWithoutDomain = allCmds.filter((cmd) => /^get_/.test(cmd));

    if (getWithDomain.length > 0 && getWithoutDomain.length > 0) {
      this.warnings.push(
        `Inconsistent GET pattern: ${getWithDomain.length} use 'domain_get_*' vs ${getWithoutDomain.length} use 'get_*'`
      );
      this.log(
        `\nInconsistent GET patterns: ${getWithDomain.length} domain-prefixed vs ${getWithoutDomain.length} verb-prefixed`,
        'warning'
      );
    }
  }

  checkResponsePatterns() {
    this.log('\n🔄 Response Type Consistency', 'info');
    this.log('─'.repeat(50), 'info');

    const nonStandard = [];

    const scanDir = (dir) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (item.endsWith('.rs')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const relativePath = path.relative(COMMANDS_DIR, fullPath);

          // Match #[tauri::command] (or #[command]) attribute, optional additional
          // attributes, optional pub/async modifiers, function name, and return type.
          // Capture group 1: function name, Capture group 2: return type
          const cmdRegex =
            /#\[(?:tauri::)?command\]\s*\n\s*(?:#\[.*\]\s*\n\s*)*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)[^{]*->\s*(.*?)\s*\{/gs;
          let match;
          while ((match = cmdRegex.exec(content)) !== null) {
            const funcName = match[1];
            const returnType = match[2].trim();

            // Check for non-standard patterns
            if (returnType.includes('String>') && !returnType.includes('ApiResponse')) {
              nonStandard.push({
                file: relativePath,
                function: funcName,
                returnType: returnType,
                issue: 'Uses Result<..., String> instead of Result<ApiResponse<T>, AppError>',
              });
            } else if (
              !returnType.includes('ApiResponse') &&
              !returnType.includes('AppResult') &&
              !returnType.includes('AppError') &&
              returnType !== ''
            ) {
              nonStandard.push({
                file: relativePath,
                function: funcName,
                returnType: returnType,
                issue: 'Uses non-standard return type',
              });
            }
          }
        }
      }
    };

    scanDir(COMMANDS_DIR);

    if (nonStandard.length > 0) {
      this.log(
        `${nonStandard.length} commands with non-standard response patterns:`,
        'warning'
      );
      nonStandard.forEach((cmd) => {
        console.log(`    ${cmd.file}::${cmd.function}`);
        console.log(`      Return: ${cmd.returnType}`);
        console.log(`      Issue: ${cmd.issue}`);
        this.warnings.push(
          `${cmd.function} in ${cmd.file}: ${cmd.issue}`
        );
      });
    } else {
      this.log('All commands use standard response patterns', 'success');
    }

    return nonStandard;
  }

  generateReport(rustCmds, frontendCmds, mismatches, nonStandardResponses) {
    this.log('\n📊 IPC Contract Audit Summary', 'info');
    this.log('═'.repeat(50), 'info');

    const common = [...rustCmds].filter((cmd) => frontendCmds.has(cmd));

    console.log(`  Rust backend commands:         ${rustCmds.size}`);
    console.log(`  Frontend registry commands:    ${frontendCmds.size}`);
    console.log(`  Commands in both:              ${common.length}`);
    console.log(`  Known backend-only:            ${KNOWN_BACKEND_ONLY.size}`);
    console.log(`  Missing from frontend:         ${mismatches.missingInFrontend.length}`);
    console.log(`  Missing from backend:          ${mismatches.missingInRust.length}`);
    console.log(`  Non-standard response types:   ${nonStandardResponses.length}`);
    console.log(`  Total errors:                  ${this.errors.length}`);
    console.log(`  Total warnings:                ${this.warnings.length}`);

    if (this.errors.length > 0) {
      this.log('\n🚨 Critical Issues (must fix):', 'error');
      this.errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
    }

    if (CI_MODE && this.errors.length > 0) {
      this.log('\n❌ IPC contract validation failed in CI mode.', 'error');
      process.exit(1);
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.log('\n🎉 IPC contract validation passed!', 'success');
    } else if (this.errors.length === 0) {
      this.log(
        '\n✅ No critical errors. Review warnings above for potential improvements.',
        'success'
      );
    }
  }

  run() {
    this.log('🔍 RPMA IPC Contract Validation', 'info');
    this.log('═'.repeat(50), 'info');

    // Verify required files exist
    if (!fs.existsSync(MAIN_RS_PATH)) {
      this.log(`main.rs not found at ${MAIN_RS_PATH}`, 'error');
      process.exit(1);
    }
    if (!fs.existsSync(COMMANDS_TS_PATH)) {
      this.log(`commands.ts not found at ${COMMANDS_TS_PATH}`, 'error');
      process.exit(1);
    }

    const rustCmds = this.extractRustCommands();
    const frontendCmds = this.extractFrontendCommands();

    const mismatches = this.checkCommandRegistration(rustCmds, frontendCmds);
    this.checkNamingConsistency(rustCmds);
    const nonStandardResponses = this.checkResponsePatterns();
    this.generateReport(rustCmds, frontendCmds, mismatches, nonStandardResponses);
  }
}

const validator = new IPCContractValidator();
validator.run();
