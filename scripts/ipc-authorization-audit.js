#!/usr/bin/env node

/**
 * RPMA IPC Authorization Audit Script
 *
 * This script audits all IPC commands to ensure they have proper authorization checks.
 * It identifies commands that lack authentication and provides recommendations.
 */

const fs = require('fs');
const path = require('path');

class AuthorizationAuditor {
    constructor() {
        this.commands = [];
        this.unauthorizedCommands = [];
        this.publicCommands = [];
        this.authenticatedCommands = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const colors = {
            error: '\x1b[31m',
            warning: '\x1b[33m',
            success: '\x1b[32m',
            info: '\x1b[36m'
        };
        const reset = '\x1b[0m';
        console.log(`[${timestamp}] ${colors[type] || colors.info}${message}${reset}`);
    }

    // Commands that are expected to be public (no authentication required)
    getExpectedPublicCommands() {
        return [
            'auth_login',
            'auth_create_account',
            'auth_test_response',
            'auth_test_string',
            'get_device_info',
            'health_check',
            'get_app_info',
            'user::bootstrap_first_admin',
            'user::has_admins',
            // System diagnostic commands that don't expose sensitive data
            'get_database_status',
            'get_database_pool_stats',
            'get_database_pool_health',
            // Auth commands that handle login/logout/session validation themselves
            'auth_logout',
            'auth_validate_session',
            'auth_refresh_token',
            // Navigation commands - client-side UI state, no DB or sensitive data access
            'navigation_update',
            'navigation_add_to_history',
            'navigation_go_back',
            'navigation_go_forward',
            'navigation_get_current',
            'navigation_refresh',
            'shortcuts_register',
            // IPC optimization commands - data compression/streaming utilities, no DB access
            'compress_data_for_ipc',
            'decompress_data_from_ipc',
            'start_stream_transfer',
            'send_stream_chunk',
            'get_stream_data',
            'get_ipc_stats',
            // Test/development commands
            'get_large_test_data',
            'test_pdf_generation'
        ];
    }

    // Commands that require special handling (may have internal auth)
    getSpecialAuthCommands() {
        return [
            // WebSocket commands often have their own auth mechanisms
            'websocket_commands::',
            // Some system commands may be admin-only internally
            'diagnose_database',
            'get_database_stats',
            'vacuum_database',
            'force_wal_checkpoint'
        ];
    }

    async scanCommandFiles() {
        const commandsDir = path.join(process.cwd(), '..', 'src-tauri', 'src', 'commands');
        this.log(`Scanning command files in: ${commandsDir}`, 'info');

        const files = this.getAllCommandFiles(commandsDir);

        for (const file of files) {
            await this.analyzeCommandFile(file);
        }
    }

    getAllCommandFiles(dir) {
        const files = [];

        function scanDir(currentDir) {
            const items = fs.readdirSync(currentDir);

            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    scanDir(fullPath);
                } else if (item.endsWith('.rs')) {
                    files.push(fullPath);
                }
            }
        }

        scanDir(dir);
        return files;
    }

    async analyzeCommandFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const commands = this.extractCommands(content, filePath);

            for (const command of commands) {
                this.commands.push(command);
                this.checkAuthorization(command, content);
            }
        } catch (error) {
            this.log(`Error reading file ${filePath}: ${error.message}`, 'error');
        }
    }

    extractCommands(content, filePath) {
        const commands = [];
        const commandRegex = /#\[tauri::command\]\s*\n\s*(?:#\[.*\]\s*\n\s*)*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*\(/g;

        let match;
        while ((match = commandRegex.exec(content)) !== null) {
            const functionName = match[1];
            const relativePath = path.relative(path.join(process.cwd(), '..', 'src-tauri', 'src'), filePath);
            const modulePath = relativePath.replace('.rs', '').replace(/\\/g, '::');

            commands.push({
                name: functionName,
                fullName: `${modulePath}::${functionName}`,
                file: relativePath,
                line: this.getLineNumber(content, match.index)
            });
        }

        return commands;
    }

    getLineNumber(content, index) {
        const beforeMatch = content.substring(0, index);
        return (beforeMatch.match(/\n/g) || []).length + 1;
    }

    checkAuthorization(command, content) {
        const expectedPublic = this.getExpectedPublicCommands();
        const specialAuth = this.getSpecialAuthCommands();

        // Check if command uses authenticate! macro
        const hasAuthMacro = content.includes(`authenticate!(`) &&
                            this.functionUsesAuthMacro(command.name, content);

        // Check if command has session_token parameter (indicates auth requirement)
        const functionPattern = new RegExp(`fn\\s+${command.name}\\s*\\([^)]*session_token[^)]*\\)`, 's');
        const hasSessionToken = functionPattern.test(content);

        // Check if command is expected to be public
        const isExpectedPublic = expectedPublic.some(publicCmd =>
            command.name.includes(publicCmd) || command.fullName.includes(publicCmd)
        );

        // Check if command has special auth handling
        const hasSpecialAuth = specialAuth.some(specialCmd =>
            command.fullName.includes(specialCmd)
        );

        if (isExpectedPublic) {
            this.publicCommands.push(command);
            this.log(`✅ ${command.fullName} - Public command (expected)`, 'success');
        } else if (hasAuthMacro || hasSessionToken) {
            this.authenticatedCommands.push(command);
            this.log(`✅ ${command.fullName} - Properly authenticated`, 'success');
        } else if (hasSpecialAuth) {
            this.authenticatedCommands.push(command);
            this.log(`⚠️  ${command.fullName} - Special auth handling`, 'warning');
        } else {
            this.unauthorizedCommands.push(command);
            this.log(`🔴 ${command.fullName} - MISSING AUTHORIZATION`, 'error');
        }
    }

    functionUsesAuthMacro(functionName, content) {
        // Find the function definition
        const functionPattern = new RegExp(`fn\\s+${functionName}\\s*\\(`, 'g');
        const match = functionPattern.exec(content);

        if (!match) return false;

        // Get content from function definition onwards
        const functionStart = match.index;
        const remainingContent = content.substring(functionStart);

        // Find the end of this function (next function or end of file)
        const nextFunctionPattern = /fn\s+\w+\s*\(/g;
        nextFunctionPattern.lastIndex = 1; // Skip current function
        const nextMatch = nextFunctionPattern.exec(remainingContent);

        const functionEnd = nextMatch ? functionStart + nextMatch.index : content.length;
        const functionContent = content.substring(functionStart, functionEnd);

        return functionContent.includes('authenticate!(');
    }

    generateReport() {
        this.log('\n📊 IPC Authorization Audit Report', 'info');
        this.log('===================================', 'info');

        this.log(`\nTotal Commands Analyzed: ${this.commands.length}`, 'info');
        this.log(`✅ Properly Authenticated: ${this.authenticatedCommands.length}`, 'success');
        this.log(`✅ Public Commands: ${this.publicCommands.length}`, 'success');
        this.log(`🔴 Missing Authorization: ${this.unauthorizedCommands.length}`, this.unauthorizedCommands.length > 0 ? 'error' : 'success');

        if (this.unauthorizedCommands.length > 0) {
            this.log('\n🚨 Commands Missing Authorization:', 'error');
            this.unauthorizedCommands.forEach((cmd, index) => {
                console.log(`${index + 1}. ${cmd.fullName}`);
                console.log(`   File: ${cmd.file}:${cmd.line}`);
                console.log(`   💡 Add: let current_user = authenticate!(&session_token, &state);`);
                console.log('');
            });
        }

        if (this.unauthorizedCommands.length === 0) {
            this.log('\n🎉 All commands have proper authorization!', 'success');
        }

        // Summary statistics
        const totalEndpoints = this.commands.length;
        const protectedEndpoints = this.authenticatedCommands.length + this.publicCommands.length;
        const protectionRate = totalEndpoints > 0 ? ((protectedEndpoints / totalEndpoints) * 100).toFixed(1) : 0;

        this.log(`\nProtection Rate: ${protectionRate}% (${protectedEndpoints}/${totalEndpoints} endpoints)`, 'info');

        if (this.unauthorizedCommands.length > 0) {
            this.log('\n⚠️  Action Required: Add authorization to the flagged commands before deployment.', 'warning');
            process.exit(1);
        }
    }

    async runAudit() {
        this.log('🔐 Starting IPC Authorization Audit...', 'info');

        await this.scanCommandFiles();
        this.generateReport();
    }
}

// Run the audit if this script is executed directly
if (require.main === module) {
    const auditor = new AuthorizationAuditor();
    auditor.runAudit().catch(error => {
        console.error('Audit failed:', error);
        process.exit(1);
    });
}

module.exports = AuthorizationAuditor;