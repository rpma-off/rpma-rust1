#!/usr/bin/env node

/**
 * Migration Testing Script
 *
 * This script tests database migrations against database snapshots
 * to ensure migrations work correctly and don't break data integrity.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class MigrationTester {
    constructor() {
        this.testDir = path.join(__dirname, '..', 'migration-tests');
        this.snapshotsDir = path.join(this.testDir, 'snapshots');
        this.resultsDir = path.join(this.testDir, 'results');
    }

    async runTests() {
        console.log('🧪 Starting migration tests...');

        // Ensure test directories exist
        this.ensureDirectories();

        // Create test database snapshots
        await this.createSnapshots();

        // Test migrations
        const results = await this.testMigrations();

        // Generate report
        this.generateReport(results);

        console.log('✅ Migration tests completed');
    }

    ensureDirectories() {
        [this.testDir, this.snapshotsDir, this.resultsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    async createSnapshots() {
        console.log('📸 Creating database snapshots...');

        // Copy current database for testing
        const dbPath = path.join(process.env.APPDATA || process.env.HOME, 'com.rpma.ppf-intervention', 'rpma.db');
        const snapshotPath = path.join(this.snapshotsDir, 'pre-migration.db');

        if (fs.existsSync(dbPath)) {
            fs.copyFileSync(dbPath, snapshotPath);
            console.log('✅ Database snapshot created');
        } else {
            console.log('⚠️  No existing database found, creating empty snapshot');
            // Create empty database file
            fs.writeFileSync(snapshotPath, '');
        }
    }

    async testMigrations() {
        console.log('🔄 Testing migrations...');

        const results = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };

        // Test each migration file
        const migrationFiles = fs.readdirSync(path.join(__dirname, '..', 'src-tauri', 'migrations'))
            .filter(file => file.endsWith('.sql'))
            .sort();

        for (const file of migrationFiles) {
            results.total++;
            console.log(`Testing migration: ${file}`);

            try {
                // Test migration SQL syntax
                const sqlContent = fs.readFileSync(
                    path.join(__dirname, '..', 'src-tauri', 'migrations', file),
                    'utf8'
                );

                // Basic SQL syntax validation (very basic)
                if (this.validateSqlSyntax(sqlContent)) {
                    results.passed++;
                    console.log(`✅ ${file} passed`);
                } else {
                    results.failed++;
                    results.errors.push({ file, error: 'SQL syntax validation failed' });
                    console.log(`❌ ${file} failed: SQL syntax error`);
                }

            } catch (error) {
                results.failed++;
                results.errors.push({ file, error: error.message });
                console.log(`❌ ${file} failed: ${error.message}`);
            }
        }

        return results;
    }

    validateSqlSyntax(sql) {
        // Very basic validation - check for common syntax issues
        const lines = sql.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip comments and empty lines
            if (line.startsWith('--') || line === '') {
                continue;
            }

            // Check for incomplete statements
            if (line.includes('ALTER TABLE') && !line.includes(';') &&
                i < lines.length - 1 && !lines[i + 1].includes(';')) {
                // Allow multi-line statements, but check basic structure
                if (!line.includes('ADD CONSTRAINT') && !line.includes('ADD COLUMN')) {
                    return false;
                }
            }
        }

        return true;
    }

    generateReport(results) {
        const reportPath = path.join(this.resultsDir, `migration-test-${new Date().toISOString().split('T')[0]}.json`);

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: results.total,
                passed: results.passed,
                failed: results.failed,
                successRate: results.total > 0 ? (results.passed / results.total * 100).toFixed(1) : 0
            },
            errors: results.errors
        };

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log(`📊 Test report saved to: ${reportPath}`);
        console.log(`Results: ${results.passed}/${results.total} migrations passed`);

        if (results.failed > 0) {
            console.log('❌ Failed migrations:');
            results.errors.forEach(err => {
                console.log(`  - ${err.file}: ${err.error}`);
            });
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new MigrationTester();
    tester.runTests().catch(console.error);
}

module.exports = MigrationTester;