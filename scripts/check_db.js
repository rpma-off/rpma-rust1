const Database = require('better-sqlite3');
const path = require('path');

try {
    const dbPath = path.join(process.env.APPDATA || '', 'com.rpma.ppf-intervention', 'rpma.db');
    console.log('Checking database at:', dbPath);

    const db = new Database(dbPath);

    // Check schema
    console.log('\n=== INTERVENTIONS TABLE SCHEMA ===');
    const schema = db.prepare('PRAGMA table_info(interventions)').all();
    console.table(schema);

    // Check intervention_steps schema
    console.log('\n=== INTERVENTION_STEPS TABLE SCHEMA ===');
    const stepsSchema = db.prepare('PRAGMA table_info(intervention_steps)').all();
    console.table(stepsSchema);
    
    // Check if device_timestamp exists
    const hasDeviceTimestamp = stepsSchema.some(row => row.name === 'device_timestamp');
    console.log(`\nHas device_timestamp column: ${hasDeviceTimestamp}`);
    
    if (!hasDeviceTimestamp) {
        console.log('❌ MISSING: device_timestamp column in intervention_steps table');
        console.log('Need to add this column to fix the save step progress error');
    } else {
        console.log('✅ device_timestamp column exists');
    }

    // Check data
    console.log('\n=== INTERVENTIONS DATA ===');
    const count = db.prepare('SELECT COUNT(*) as total FROM interventions').get();
    console.log(`Total interventions: ${count.total}`);

    const withTaskId = db.prepare('SELECT COUNT(*) as count FROM interventions WHERE task_id IS NOT NULL AND task_id != \'UNKNOWN\'').get();
    console.log(`Interventions with valid task_id: ${withTaskId.count}`);

    const unknown = db.prepare('SELECT COUNT(*) as count FROM interventions WHERE task_id = \'UNKNOWN\'').get();
    console.log(`Interventions with UNKNOWN task_id: ${unknown.count}`);

    // Check schema version
    console.log('\n=== SCHEMA VERSION ===');
    const version = db.prepare('SELECT MAX(version) as version FROM schema_version').get();
    console.log(`Current schema version: ${version.version}`);

    db.close();

} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}