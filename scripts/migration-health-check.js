#!/usr/bin/env node

/**
 * Migration Monitoring and Health Check Script
 *
 * This script monitors database migration health, checks for issues,
 * and provides recommendations for maintaining database integrity.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class MigrationMonitor {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.migrationDir = path.join(this.projectRoot, 'src-tauri', 'migrations');
        this.testResultsDir = path.join(this.projectRoot, 'migration-tests', 'results');
    }

    async runHealthCheck() {
        console.log('🔍 Running database migration health check...\n');

        const results = {
            timestamp: new Date().toISOString(),
            checks: {}
        };

        // Check migration file integrity
        results.checks.migrationFiles = this.checkMigrationFiles();

        // Check migration test results
        results.checks.testResults = this.checkTestResults();

        // Check for database consistency
        results.checks.databaseConsistency = this.checkDatabaseConsistency();

        // Check migration dependencies
        results.checks.dependencies = this.checkMigrationDependencies();

        // Generate recommendations
        results.recommendations = this.generateRecommendations(results);

        // Display results
        this.displayResults(results);

        // Save report
        this.saveReport(results);

        return results;
    }

    checkMigrationFiles() {
        console.log('📁 Checking migration files...');

        const files = fs.readdirSync(this.migrationDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        const issues = [];

        files.forEach(file => {
            const filePath = path.join(this.migrationDir, file);
            const content = fs.readFileSync(filePath, 'utf8');

            // Check for basic syntax issues
            if (content.includes('-- TODO') || content.includes('-- FIXME')) {
                issues.push(`${file}: Contains TODO/FIXME comments`);
            }

            // Check for potentially problematic patterns
            if (content.includes('DROP TABLE') && !content.includes('IF EXISTS')) {
                issues.push(`${file}: Uses DROP TABLE without IF EXISTS`);
            }

            if (content.includes('DELETE FROM') && !content.includes('WHERE')) {
                issues.push(`${file}: DELETE without WHERE clause`);
            }
        });

        return {
            totalFiles: files.length,
            issues: issues,
            status: issues.length === 0 ? 'PASS' : 'WARN'
        };
    }

    checkTestResults() {
        console.log('🧪 Checking migration test results...');

        if (!fs.existsSync(this.testResultsDir)) {
            return {
                status: 'MISSING',
                message: 'No test results directory found',
                lastRun: null
            };
        }

        const resultFiles = fs.readdirSync(this.testResultsDir)
            .filter(file => file.startsWith('migration-test-'))
            .sort()
            .reverse();

        if (resultFiles.length === 0) {
            return {
                status: 'NO_RESULTS',
                message: 'No test results found',
                lastRun: null
            };
        }

        const latestResult = JSON.parse(
            fs.readFileSync(path.join(this.testResultsDir, resultFiles[0]), 'utf8')
        );

        const daysSinceLastTest = Math.floor(
            (new Date() - new Date(latestResult.timestamp)) / (1000 * 60 * 60 * 24)
        );

        return {
            status: latestResult.summary.failed === 0 ? 'PASS' : 'FAIL',
            lastRun: latestResult.timestamp,
            daysSinceLastTest,
            summary: latestResult.summary,
            message: daysSinceLastTest > 7 ?
                `Tests are ${daysSinceLastTest} days old - consider running fresh tests` :
                'Tests are current'
        };
    }

    checkDatabaseConsistency() {
        console.log('🗃️  Checking database consistency markers...');

        // This would ideally connect to the database, but for now we'll check file markers
        const dbPath = path.join(process.env.APPDATA || process.env.HOME,
            'com.rpma.ppf-intervention', 'rpma.db');

        if (!fs.existsSync(dbPath)) {
            return {
                status: 'NO_DB',
                message: 'Database file not found'
            };
        }

        const stats = fs.statSync(dbPath);
        const daysSinceModified = Math.floor(
            (new Date() - new Date(stats.mtime)) / (1000 * 60 * 60 * 24)
        );

        return {
            status: 'OK',
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
            daysSinceModified,
            message: daysSinceModified > 30 ?
                `Database not modified in ${daysSinceModified} days - check if system is active` :
                'Database appears active'
        };
    }

    checkMigrationDependencies() {
        console.log('🔗 Checking migration dependencies...');

        const migrationFiles = fs.readdirSync(this.migrationDir)
            .filter(file => file.endsWith('.sql'))
            .map(file => {
                const num = parseInt(file.split('_')[0]);
                return { file, number: num };
            })
            .sort((a, b) => a.number - b.number);

        const gaps = [];
        for (let i = 0; i < migrationFiles.length - 1; i++) {
            if (migrationFiles[i + 1].number !== migrationFiles[i].number + 1) {
                gaps.push({
                    from: migrationFiles[i].number,
                    to: migrationFiles[i + 1].number,
                    gap: migrationFiles[i + 1].number - migrationFiles[i].number - 1
                });
            }
        }

        return {
            totalMigrations: migrationFiles.length,
            gaps: gaps,
            status: gaps.length === 0 ? 'PASS' : 'WARN',
            message: gaps.length === 0 ?
                'No gaps in migration sequence' :
                `Found ${gaps.length} gap(s) in migration sequence`
        };
    }

    generateRecommendations(results) {
        const recommendations = [];

        if (results.checks.migrationFiles.issues.length > 0) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Migration Quality',
                message: 'Fix syntax and quality issues in migration files',
                details: results.checks.migrationFiles.issues
            });
        }

        if (results.checks.testResults.status !== 'PASS') {
            recommendations.push({
                priority: 'HIGH',
                category: 'Testing',
                message: 'Run migration tests to ensure reliability',
                action: 'npm run migration:test'
            });
        }

        if (results.checks.testResults.daysSinceLastTest > 7) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Testing',
                message: 'Migration tests are outdated',
                action: 'Run fresh migration tests'
            });
        }

        if (results.checks.dependencies.gaps.length > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Migration Management',
                message: 'Review migration sequence gaps',
                details: results.checks.dependencies.gaps
            });
        }

        if (results.checks.databaseConsistency.daysSinceModified > 30) {
            recommendations.push({
                priority: 'LOW',
                category: 'System Health',
                message: 'Database appears inactive - verify system status'
            });
        }

        return recommendations;
    }

    displayResults(results) {
        console.log('\n📊 Health Check Results:');
        console.log('='.repeat(50));

        Object.entries(results.checks).forEach(([check, result]) => {
            const status = this.getStatusIcon(result.status);
            console.log(`${status} ${check}: ${result.status}`);

            if (result.message) {
                console.log(`   ${result.message}`);
            }

            if (result.issues && result.issues.length > 0) {
                result.issues.forEach(issue => console.log(`   - ${issue}`));
            }
        });

        if (results.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            console.log('-'.repeat(30));

            results.recommendations.forEach(rec => {
                const priority = this.getPriorityIcon(rec.priority);
                console.log(`${priority} [${rec.priority}] ${rec.category}: ${rec.message}`);

                if (rec.action) {
                    console.log(`   → ${rec.action}`);
                }

                if (rec.details) {
                    rec.details.forEach(detail => console.log(`   • ${detail}`));
                }
            });
        }

        console.log('\n✅ Health check completed');
    }

    getStatusIcon(status) {
        switch (status) {
            case 'PASS': return '✅';
            case 'FAIL': return '❌';
            case 'WARN': return '⚠️ ';
            case 'MISSING': return '❓';
            case 'NO_RESULTS': return '📭';
            case 'NO_DB': return '📁';
            default: return '❓';
        }
    }

    getPriorityIcon(priority) {
        switch (priority) {
            case 'HIGH': return '🔴';
            case 'MEDIUM': return '🟡';
            case 'LOW': return '🟢';
            default: return '⚪';
        }
    }

    saveReport(results) {
        const reportPath = path.join(this.testResultsDir, `health-check-${new Date().toISOString().split('T')[0]}.json`);

        // Ensure directory exists
        if (!fs.existsSync(path.dirname(reportPath))) {
            fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        }

        fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
        console.log(`📄 Report saved to: ${reportPath}`);
    }
}

// Run health check if called directly
if (require.main === module) {
    const monitor = new MigrationMonitor();
    monitor.runHealthCheck().catch(console.error);
}

module.exports = MigrationMonitor;