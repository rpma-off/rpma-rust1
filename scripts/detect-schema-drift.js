#!/usr/bin/env node

/**
 * Schema Drift Detection and Analysis Script
 *
 * This script analyzes the current database schema against expected schema
 * to detect drifts, inconsistencies, and potential issues.
 */

const fs = require('fs');
const path = require('path');

class SchemaDriftDetector {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.schemaFile = path.join(this.projectRoot, 'src-tauri', 'src', 'db', 'schema.sql');
        this.expectedIndexes = this.loadExpectedIndexes();
    }

    async detectDrift() {
        console.log('🔍 Detecting schema drift...\n');

        const issues = [];

        try {
            // This would ideally connect to the database
            // For now, we'll do static analysis of the schema file

            const schemaContent = fs.readFileSync(this.schemaFile, 'utf8');

            // Check for expected indexes
            const foundIndexes = this.extractIndexesFromSchema(schemaContent);
            const missingIndexes = this.findMissingIndexes(foundIndexes);

            if (missingIndexes.length > 0) {
                issues.push({
                    type: 'MISSING_INDEXES',
                    severity: 'MEDIUM',
                    description: 'Expected indexes not found in schema',
                    details: missingIndexes,
                    recommendation: 'Run migrations to create missing indexes'
                });
            }

            // Check for foreign key constraints
            const foreignKeys = this.extractForeignKeysFromSchema(schemaContent);
            if (foreignKeys.length === 0) {
                issues.push({
                    type: 'NO_FOREIGN_KEYS',
                    severity: 'HIGH',
                    description: 'No foreign key constraints found in schema',
                    details: ['Foreign keys are essential for data integrity'],
                    recommendation: 'Ensure foreign key constraints are properly defined'
                });
            }

            // Check for table structure consistency
            const tables = this.extractTablesFromSchema(schemaContent);
            const structuralIssues = this.checkTableStructure(tables);

            if (structuralIssues.length > 0) {
                issues.push({
                    type: 'STRUCTURAL_ISSUES',
                    severity: 'HIGH',
                    description: 'Schema structure issues detected',
                    details: structuralIssues,
                    recommendation: 'Review and fix table definitions'
                });
            }

        } catch (error) {
            issues.push({
                type: 'ANALYSIS_ERROR',
                severity: 'CRITICAL',
                description: 'Failed to analyze schema',
                details: [error.message],
                recommendation: 'Check schema file and analysis script'
            });
        }

        this.displayResults(issues);
        this.saveReport(issues);

        return issues;
    }

    loadExpectedIndexes() {
        return {
            tasks: [
                'idx_tasks_status',
                'idx_tasks_technician_id',
                'idx_tasks_client_id',
                'idx_tasks_priority',
                'idx_tasks_scheduled_date',
                'idx_tasks_created_at',
                'idx_tasks_synced',
                'idx_tasks_task_number',
                'idx_tasks_status_technician',
                'idx_tasks_status_priority',
                'idx_tasks_client_status',
                'idx_tasks_technician_scheduled',
                'idx_tasks_status_scheduled',
                'idx_tasks_sync_status',
            ],
            interventions: [
                'idx_interventions_status',
                'idx_interventions_synced',
                'idx_interventions_technician',
                'idx_interventions_client',
                'idx_interventions_scheduled',
                'idx_interventions_created',
                'idx_interventions_task_number',
                'idx_interventions_vehicle_plate',
                'idx_interventions_status_technician',
                'idx_interventions_status_scheduled',
                'idx_interventions_status_created',
                'idx_interventions_client_status',
                'idx_interventions_technician_scheduled',
                'idx_interventions_technician_created',
                'idx_interventions_client_created',
                'idx_interventions_sync_status',
            ],
            photos: [
                'idx_photos_intervention',
                'idx_photos_step',
                'idx_photos_synced',
                'idx_photos_type',
                'idx_photos_category',
            ],
            clients: [
                'idx_clients_name',
                'idx_clients_email',
                'idx_clients_customer_type',
                'idx_clients_created_at',
                'idx_clients_synced',
            ],
            users: [
                'idx_users_email',
                'idx_users_username',
                'idx_users_role',
                'idx_users_active',
            ],
            sync_queue: [
                'idx_sync_pending',
                'idx_sync_entity',
                'idx_sync_status',
                'idx_sync_timestamp',
            ],
        };
    }

    extractIndexesFromSchema(schema) {
        const indexPattern = /CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+ON\s+(\w+)/gi;
        const foundIndexes = new Map();

        let match;
        while ((match = indexPattern.exec(schema)) !== null) {
            const indexName = match[1];
            const tableName = match[2];

            if (!foundIndexes.has(tableName)) {
                foundIndexes.set(tableName, []);
            }
            foundIndexes.get(tableName).push(indexName);
        }

        return foundIndexes;
    }

    findMissingIndexes(foundIndexes) {
        const missing = [];

        for (const [table, expectedIndexes] of Object.entries(this.expectedIndexes)) {
            const found = foundIndexes.get(table) || [];

            for (const expected of expectedIndexes) {
                if (!found.includes(expected)) {
                    missing.push(`${table}.${expected}`);
                }
            }
        }

        return missing;
    }

    extractForeignKeysFromSchema(schema) {
        const fkPattern = /FOREIGN\s+KEY\s*\([^)]+\)\s*REFERENCES\s+[^,;\n]+/gi;
        const foreignKeys = [];

        let match;
        while ((match = fkPattern.exec(schema)) !== null) {
            foreignKeys.push(match[0].trim());
        }

        return foreignKeys;
    }

    extractTablesFromSchema(schema) {
        const tablePattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(/gi;
        const tables = [];

        let match;
        while ((match = tablePattern.exec(schema)) !== null) {
            const tableName = match[1];
            // Extract table definition (simplified)
            const start = match.index;
            let parenCount = 0;
            let end = start;

            for (let i = start; i < schema.length; i++) {
                if (schema[i] === '(') parenCount++;
                else if (schema[i] === ')') {
                    parenCount--;
                    if (parenCount === 0) {
                        end = i + 1;
                        break;
                    }
                }
            }

            const definition = schema.substring(start, end);
            tables.push({ name: tableName, definition });
        }

        return tables;
    }

    checkTableStructure(tables) {
        const issues = [];

        for (const table of tables) {
            // Check for required columns
            const requiredColumns = this.getRequiredColumns(table.name);
            const definition = table.definition.toLowerCase();

            for (const column of requiredColumns) {
                if (!definition.includes(column.toLowerCase())) {
                    issues.push(`Table ${table.name} missing required column: ${column}`);
                }
            }

            // Check for data type consistency
            if (table.name === 'tasks' && !definition.includes('vehicle_year integer')) {
                issues.push(`Table ${table.name} should have vehicle_year as INTEGER`);
            }
        }

        return issues;
    }

    getRequiredColumns(tableName) {
        const required = {
            tasks: ['id', 'task_number', 'title', 'status', 'created_at', 'updated_at'],
            interventions: ['id', 'task_id', 'status', 'created_at', 'updated_at'],
            photos: ['id', 'intervention_id', 'file_path', 'created_at'],
            clients: ['id', 'name', 'created_at', 'updated_at'],
            users: ['id', 'email', 'username', 'password_hash', 'first_name', 'last_name'],
        };

        return required[tableName] || [];
    }

    displayResults(issues) {
        console.log('📊 Schema Drift Analysis Results:');
        console.log('='.repeat(50));

        if (issues.length === 0) {
            console.log('✅ No schema drift detected - schema is consistent');
            return;
        }

        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

        // Sort by severity
        issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        for (const issue of issues) {
            const icon = this.getSeverityIcon(issue.severity);
            console.log(`${icon} [${issue.severity}] ${issue.type}: ${issue.description}`);

            if (issue.details && issue.details.length > 0) {
                issue.details.forEach(detail => console.log(`   • ${detail}`));
            }

            if (issue.recommendation) {
                console.log(`   💡 ${issue.recommendation}`);
            }

            console.log('');
        }

        console.log(`🔍 Found ${issues.length} schema drift issue(s)`);
    }

    getSeverityIcon(severity) {
        switch (severity) {
            case 'CRITICAL': return '🔴';
            case 'HIGH': return '🟠';
            case 'MEDIUM': return '🟡';
            case 'LOW': return '🟢';
            default: return '⚪';
        }
    }

    saveReport(issues) {
        const reportPath = path.join(this.projectRoot, 'migration-tests', 'results', `schema-drift-${new Date().toISOString().split('T')[0]}.json`);

        // Ensure directory exists
        const dir = path.dirname(reportPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total_issues: issues.length,
                critical: issues.filter(i => i.severity === 'CRITICAL').length,
                high: issues.filter(i => i.severity === 'HIGH').length,
                medium: issues.filter(i => i.severity === 'MEDIUM').length,
                low: issues.filter(i => i.severity === 'LOW').length,
            },
            issues: issues
        };

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 Report saved to: ${reportPath}`);
    }
}

// Run drift detection if called directly
if (require.main === module) {
    const detector = new SchemaDriftDetector();
    detector.detectDrift().catch(console.error);
}

module.exports = SchemaDriftDetector;