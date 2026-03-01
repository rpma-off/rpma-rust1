const fs = require('fs');
const os = require('os');
const path = require('path');

const appDataDir =
  process.env.APPDATA ||
  (process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Application Support')
    : path.join(os.homedir(), '.config'));

const dbPath = path.join(appDataDir, 'com.rpma.ppf-intervention', 'rpma.db');

console.log('Checking signup trigger repair state');
console.log(`Database path: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
  console.error('Database file not found');
  process.exit(1);
}

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(dbPath);

  const triggerCountBefore = db
    .prepare(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='trigger' AND name='user_insert_create_settings'"
    )
    .get().count;

  console.log(`Trigger exists before repair: ${triggerCountBefore > 0}`);

  if (triggerCountBefore > 0) {
    db.exec('DROP TRIGGER IF EXISTS user_insert_create_settings');
    console.log('Dropped trigger: user_insert_create_settings');
  } else {
    console.log('No trigger to drop; no action needed');
  }

  const triggerCountAfter = db
    .prepare(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='trigger' AND name='user_insert_create_settings'"
    )
    .get().count;

  const schemaVersionRow = db
    .prepare('SELECT MAX(version) AS version FROM schema_version')
    .get();

  console.log(`Schema version max: ${schemaVersionRow ? schemaVersionRow.version : null}`);
  console.log(`Trigger exists after repair: ${triggerCountAfter > 0}`);
  console.log('Signup trigger repair completed');
} catch (error) {
  console.error(`Signup trigger repair failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (db) {
    db.close();
  }
}
