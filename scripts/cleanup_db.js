const fs = require('fs');
const path = require('path');
const os = require('os');

// Determine app data directory
const appDataDir = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : path.join(os.homedir(), '.config'));
const dbPath = path.join(appDataDir, 'com.rpma.ppf-intervention', 'rpma.db');

console.log('🔧 Cleaning up corrupted database state');
console.log('Database path:', dbPath);

if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file does not exist');
    process.exit(1);
}

try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath);

    console.log('✅ Database opened for cleanup');

    // Drop problematic triggers
    console.log('Dropping problematic triggers...');
    try {
        db.exec('DROP TRIGGER IF EXISTS chk_material_consumption_quality_trigger');
        console.log('✅ Dropped chk_material_consumption_quality_trigger');
    } catch (e) {
        console.log('⚠️ Could not drop chk_material_consumption_quality_trigger:', e.message);
    }

    try {
        db.exec('DROP TRIGGER IF EXISTS chk_material_consumption_quality_update_trigger');
        console.log('✅ Dropped chk_material_consumption_quality_update_trigger');
    } catch (e) {
        console.log('⚠️ Could not drop chk_material_consumption_quality_update_trigger:', e.message);
    }

    // Drop leftover tables from failed migrations
    console.log('Dropping leftover tables...');
    const leftoverTables = ['materials_new', 'material_consumption_new', 'tasks_new'];
    for (const table of leftoverTables) {
        try {
            db.exec(`DROP TABLE IF EXISTS ${table}`);
            console.log(`✅ Dropped ${table}`);
        } catch (e) {
            console.log(`⚠️ Could not drop ${table}:`, e.message);
        }
    }

    // Check current schema version
    const currentVersion = db.prepare('SELECT MAX(version) FROM schema_version').get();
    console.log(`Current schema version: ${currentVersion['MAX(version)']}`);

    // Reset to version 12 (before migration 13)
    console.log('Resetting schema version to 12...');
    db.exec('DELETE FROM schema_version WHERE version > 12');
    console.log('✅ Schema version reset to 12');

    // Verify cleanup
    const remainingTriggers = db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type='trigger'").all();
    console.log('\n📋 Remaining triggers:');
    remainingTriggers.forEach(t => console.log(`  - ${t.name} (on ${t.tbl_name})`));

    const remainingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_new'").all();
    console.log('\n📋 Remaining _new tables:');
    if (remainingTables.length === 0) {
        console.log('  None');
    } else {
        remainingTables.forEach(t => console.log(`  - ${t.name}`));
    }

    db.close();
    console.log('\n✅ Database cleanup completed. You can now retry the migration.');

} catch (error) {
    console.error('❌ Database cleanup failed:', error.message);
    process.exit(1);
}