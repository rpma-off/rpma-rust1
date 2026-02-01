const fs = require('fs');
const path = require('path');
const os = require('os');

// Determine app data directory
const appDataDir = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : path.join(os.homedir(), '.config'));
const dbPath = path.join(appDataDir, 'com.rpma.ppf-intervention', 'rpma.db');

console.log('🔍 Checking RPMA Database Schema');
console.log('Database path:', dbPath);

if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file does not exist');
    process.exit(1);
}

// Try to open database
try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });

    console.log('✅ Database opened successfully');

    // Get all tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('\n📋 Tables in database:');
    tables.forEach(table => console.log(`  - ${table.name}`));

    // Get all triggers
    const triggers = db.prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger'").all();
    console.log('\n🔥 Triggers in database:');
    if (triggers.length === 0) {
        console.log('  No triggers found');
    } else {
        triggers.forEach(trigger => {
            console.log(`  - ${trigger.name} (on ${trigger.tbl_name})`);
            // Show first 100 chars of SQL
            const sql = trigger.sql.substring(0, 100);
            console.log(`    SQL: ${sql}${trigger.sql.length > 100 ? '...' : ''}`);
        });
    }

    // Check schema_version table
    try {
        const versions = db.prepare("SELECT version, applied_at FROM schema_version ORDER BY version").all();
        console.log('\n📊 Applied migrations:');
        versions.forEach(v => {
            const date = new Date(v.applied_at).toISOString();
            console.log(`  - Migration ${v.version} applied at ${date}`);
        });
    } catch (e) {
        console.log('\n📊 Schema version table does not exist or is empty');
    }

    db.close();
    console.log('\n✅ Database schema check completed');

} catch (error) {
    console.error('❌ Database check failed:', error.message);
    process.exit(1);
}