#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class MigrationSystemValidator {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.migrationsDir = path.join(this.projectRoot, 'src-tauri', 'migrations');
        this.schemaPath = path.join(this.projectRoot, 'src-tauri', 'src', 'db', 'schema.sql');
    }

    run() {
        const results = [
            this.checkMigrationFilenameIntegrity(),
            this.checkSchemaForLegacyDrift(),
            this.runFreshDbSimulation(),
        ];

        const summary = {
            ok: results.every((result) => result.ok),
            checks: results,
        };

        console.log(JSON.stringify(summary, null, 2));

        if (!summary.ok) {
            process.exit(1);
        }
    }

    checkMigrationFilenameIntegrity() {
        const result = {
            name: 'migration_filename_integrity',
            ok: true,
            issues: [],
        };

        const files = fs
            .readdirSync(this.migrationsDir)
            .filter((file) => file.endsWith('.sql'))
            .sort();

        const versionToFiles = new Map();
        const validName = /^(\d+)_([a-z0-9][a-z0-9_]*)\.sql$/;

        for (const file of files) {
            const match = file.match(validName);
            if (!match) {
                result.ok = false;
                result.issues.push(`Invalid migration filename format: ${file}`);
                continue;
            }

            const version = Number.parseInt(match[1], 10);
            if (!versionToFiles.has(version)) {
                versionToFiles.set(version, []);
            }
            versionToFiles.get(version).push(file);
        }

        for (const [version, versionFiles] of versionToFiles.entries()) {
            if (versionFiles.length > 1) {
                result.ok = false;
                result.issues.push(
                    `Duplicate migration version ${version}: ${versionFiles.join(', ')}`
                );
            }
        }

        result.total_migrations = files.length;
        return result;
    }

    checkSchemaForLegacyDrift() {
        const result = {
            name: 'schema_legacy_drift',
            ok: true,
            issues: [],
        };

        const raw = fs.readFileSync(this.schemaPath, 'utf8');
        const withoutLineComments = raw.replace(/--.*$/gm, '');

        if (/\buser_sessions\b/i.test(withoutLineComments)) {
            result.ok = false;
            result.issues.push('schema.sql still contains legacy user_sessions artifact(s)');
        }

        if (/\bppf_zone\b/i.test(withoutLineComments)) {
            result.ok = false;
            result.issues.push('schema.sql still contains legacy ppf_zone artifact(s)');
        }

        const normalized = withoutLineComments.toLowerCase().replace(/\s+/g, ' ').trim();
        const requiredFragments = [
            "create view if not exists client_statistics as",
            "coalesce(count(distinct case when t.status in ('pending', 'in_progress') then t.id end), 0) as active_tasks",
            'max(t.updated_at) as last_task_date',
        ];

        for (const fragment of requiredFragments) {
            if (!normalized.includes(fragment)) {
                result.ok = false;
                result.issues.push(`schema.sql missing required client_statistics fragment: ${fragment}`);
            }
        }

        return result;
    }

    runFreshDbSimulation() {
        const result = {
            name: 'fresh_db_simulation',
            ok: true,
            command: 'cargo test migrations_fresh_db --verbose',
        };

        try {
            execSync(result.command, {
                cwd: path.join(this.projectRoot, 'src-tauri'),
                stdio: 'pipe',
                encoding: 'utf8',
            });
        } catch (error) {
            result.ok = false;
            const stderr = typeof error.stderr === 'string' ? error.stderr.trim() : '';
            const stdout = typeof error.stdout === 'string' ? error.stdout.trim() : '';
            const tail = [stderr, stdout]
                .filter(Boolean)
                .join('\n')
                .split('\n')
                .slice(-25)
                .join('\n');
            result.error = tail || error.message;
        }

        return result;
    }
}

if (require.main === module) {
    new MigrationSystemValidator().run();
}

module.exports = MigrationSystemValidator;
