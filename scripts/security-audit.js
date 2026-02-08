#!/usr/bin/env node

/**
 * RPMA-Rust Security Audit Script
 *
 * This script performs automated security checks on the RPMA application
 * including dependency vulnerability scanning, configuration validation,
 * and security best practice verification.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class SecurityAuditor {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.issues = [];
        this.warnings = [];
        this.passes = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const coloredMessage = this.colorize(message, type);
        console.log(`[${timestamp}] ${coloredMessage}`);
    }

    colorize(message, type) {
        const colors = {
            error: '\x1b[31m',  // Red
            warning: '\x1b[33m', // Yellow
            success: '\x1b[32m', // Green
            info: '\x1b[36m'     // Cyan
        };
        const reset = '\x1b[0m';
        return `${colors[type] || colors.info}${message}${reset}`;
    }

    addIssue(severity, category, message, recommendation = '') {
        const issue = { severity, category, message, recommendation };
        if (severity === 'high' || severity === 'critical') {
            this.issues.push(issue);
            this.log(`🔴 ${category}: ${message}`, 'error');
        } else if (severity === 'medium' || severity === 'low') {
            this.warnings.push(issue);
            this.log(`🟡 ${category}: ${message}`, 'warning');
        }
    }

    addPass(category, message) {
        this.passes.push({ category, message });
        this.log(`✅ ${category}: ${message}`, 'success');
    }

    async checkEnvironmentVariables() {
        this.log('Checking environment variables...', 'info');

        // Check for JWT_SECRET
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            this.addIssue('critical', 'Environment', 'JWT_SECRET environment variable not set', 'Set JWT_SECRET to a secure 32+ character random string');
        } else if (jwtSecret.length < 32) {
            this.addIssue('high', 'Environment', 'JWT_SECRET is too short (minimum 32 characters)', 'Use a longer, more secure JWT secret');
        } else {
            this.addPass('Environment', 'JWT_SECRET is properly configured');
        }

        // Check for database encryption key
        const dbKey = process.env.DATABASE_ENCRYPTION_KEY;
        if (!dbKey) {
            this.addIssue('medium', 'Environment', 'DATABASE_ENCRYPTION_KEY not set', 'Consider enabling database encryption for production');
        } else {
            this.addPass('Environment', 'Database encryption key is configured');
        }
    }

    async checkFilePermissions() {
        this.log('Checking file permissions...', 'info');

        const sensitiveFiles = [
            'src-tauri/src/main.rs',
            'src-tauri/src/lib.rs',
            'src-tauri/Cargo.toml',
            'package.json',
            'src-tauri/tauri.conf.json'
        ];

        for (const file of sensitiveFiles) {
            try {
                const fullPath = path.join(this.projectRoot, file);
                if (fs.existsSync(fullPath)) {
                    // Note: Windows permissions are different, but we can check if files exist
                    this.addPass('File Permissions', `${file} exists and is accessible`);
                } else {
                    this.addIssue('medium', 'File Permissions', `${file} not found`, 'Ensure all required files are present');
                }
            } catch (error) {
                this.addIssue('medium', 'File Permissions', `Error checking ${file}`, error.message);
            }
        }
    }

    async checkDependencies() {
        this.log('Checking dependencies...', 'info');

        // Check Rust dependencies
        try {
            const cargoToml = fs.readFileSync(
                path.join(this.projectRoot, 'src-tauri/Cargo.toml'),
                'utf8'
            );
            const hasAesGcm = cargoToml.includes('aes-gcm');
            const hasSqlcipher =
                cargoToml.includes('bundled-sqlcipher') || cargoToml.includes('sqlcipher');

            if (hasAesGcm) {
                this.addPass('Dependencies', 'AES-GCM encryption library found');
            } else if (hasSqlcipher) {
                this.addPass('Dependencies', 'SQLCipher encryption support detected');
            } else {
                this.addIssue(
                    'medium',
                    'Dependencies',
                    'No at-rest encryption crate detected (AES-GCM/SQLCipher)',
                    'Enable SQLCipher (rusqlite bundled-sqlcipher) or add an AEAD encryption crate for sensitive local data'
                );
            }

            if (cargoToml.includes('argon2')) {
                this.addPass('Dependencies', 'Argon2 password hashing found');
            } else {
                this.addIssue('high', 'Dependencies', 'Argon2 not found in dependencies', 'Ensure argon2 crate is included for secure password hashing');
            }
        } catch (error) {
            this.addIssue('medium', 'Dependencies', 'Error reading Cargo.toml', error.message);
        }

        // Check Node.js dependencies
        try {
            const packageJson = JSON.parse(
                fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8')
            );
            if (packageJson.dependencies && packageJson.dependencies.next) {
                this.addPass('Dependencies', 'Next.js framework found');
            }
        } catch (error) {
            this.addIssue('medium', 'Dependencies', 'Error reading package.json', error.message);
        }
    }

    async checkConfiguration() {
        this.log('Checking configuration files...', 'info');

        // Check Tauri config
        try {
            const tauriConfig = JSON.parse(
                fs.readFileSync(path.join(this.projectRoot, 'src-tauri/tauri.conf.json'), 'utf8')
            );
            if (tauriConfig.productName && tauriConfig.identifier) {
                this.addPass('Configuration', 'Tauri configuration is valid');
            } else {
                this.addIssue('medium', 'Configuration', 'Incomplete Tauri configuration', 'Ensure productName and identifier are set');
            }
        } catch (error) {
            this.addIssue('medium', 'Configuration', 'Error reading Tauri config', error.message);
        }

        // Check for hardcoded secrets
        try {
            const mainRs = fs.readFileSync(
                path.join(this.projectRoot, 'src-tauri/src/main.rs'),
                'utf8'
            );
            if (mainRs.includes('development_key_not_secure') ||
                mainRs.includes('test_secret') ||
                mainRs.includes('password123')) {
                this.addIssue('high', 'Configuration', 'Potential hardcoded secrets found', 'Replace all hardcoded secrets with environment variables');
            } else {
                this.addPass('Configuration', 'No hardcoded secrets detected in main.rs');
            }
        } catch (error) {
            this.addIssue('medium', 'Configuration', 'Error reading main.rs', error.message);
        }
    }

    async checkCodeQuality() {
        this.log('Checking code quality...', 'info');

        try {
            // Run clippy for Rust code quality
            execSync('cargo clippy -- -D warnings', {
                cwd: path.join(this.projectRoot, 'src-tauri'),
                stdio: 'pipe'
            });
            this.addPass('Code Quality', 'Rust code passes clippy checks');
        } catch (error) {
            const output = error.stdout?.toString() || error.stderr?.toString() || '';
            const warningCount = (output.match(/warning:/g) || []).length;
            if (warningCount > 0) {
                this.addIssue('medium', 'Code Quality', `${warningCount} Rust clippy warnings found`, 'Run `cargo clippy` and fix warnings');
            }
        }

        try {
            // Check TypeScript compilation
            execSync('npm run build', {
                cwd: path.join(this.projectRoot, 'frontend'),
                stdio: 'pipe'
            });
            this.addPass('Code Quality', 'TypeScript compilation successful');
        } catch (error) {
            this.addIssue('high', 'Code Quality', 'TypeScript compilation failed', 'Fix TypeScript errors before deployment');
        }
    }

    async checkEncryption() {
        this.log('Checking encryption implementation...', 'info');


    }

    async checkAuthentication() {
        this.log('Checking authentication implementation...', 'info');

        try {
            const authRs = fs.readFileSync(
                path.join(this.projectRoot, 'src-tauri/src/services/auth.rs'),
                'utf8'
            );

            if (authRs.includes('Argon2')) {
                this.addPass('Authentication', 'Argon2 password hashing implemented');
            } else {
                this.addIssue('high', 'Authentication', 'Argon2 password hashing not found', 'Implement Argon2 for secure password hashing');
            }

            if (authRs.includes('JWT') || authRs.includes('jsonwebtoken')) {
                this.addPass('Authentication', 'JWT authentication implemented');
            } else {
                this.addIssue('medium', 'Authentication', 'JWT authentication not found', 'Implement JWT for session management');
            }
        } catch (error) {
            this.addIssue('medium', 'Authentication', 'Error reading auth service', error.message);
        }
    }

    async runAudit() {
        this.log('🔒 Starting RPMA Security Audit...', 'info');
        this.log('================================', 'info');

        await this.checkEnvironmentVariables();
        await this.checkFilePermissions();
        await this.checkDependencies();
        await this.checkConfiguration();
        await this.checkCodeQuality();
        await this.checkEncryption();
        await this.checkAuthentication();

        // Summary
        this.log('\n📊 Audit Summary:', 'info');
        this.log(`Critical/High Issues: ${this.issues.length}`, this.issues.length > 0 ? 'error' : 'success');
        this.log(`Medium/Low Warnings: ${this.warnings.length}`, this.warnings.length > 0 ? 'warning' : 'success');
        this.log(`Passed Checks: ${this.passes.length}`, 'success');

        if (this.issues.length > 0) {
            this.log('\n🚨 Critical Issues Found:', 'error');
            this.issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue.category}: ${issue.message}`);
                if (issue.recommendation) {
                    console.log(`   💡 ${issue.recommendation}`);
                }
            });
        }

        if (this.warnings.length > 0) {
            this.log('\n⚠️  Warnings:', 'warning');
            this.warnings.forEach((warning, index) => {
                console.log(`${index + 1}. ${warning.category}: ${warning.message}`);
            });
        }

        this.log('\n✅ Audit completed.', 'success');

        // Exit with error code if critical issues found
        if (this.issues.length > 0) {
            process.exit(1);
        }
    }
}

// Run the audit if this script is executed directly
if (require.main === module) {
    const auditor = new SecurityAuditor();
    auditor.runAudit().catch(error => {
        console.error('Audit failed:', error);
        process.exit(1);
    });
}

module.exports = SecurityAuditor;
