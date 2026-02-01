const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.env.APPDATA || process.env.HOME, 'com.rpma.ppf-intervention', 'rpma.db');

try {
  const db = new Database(dbPath, { readonly: true });

  // Check if clients table exists
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='clients';").get();
  console.log('Clients table exists:', !!tableExists);

  if (tableExists) {
    // Count clients
    const clientCount = db.prepare("SELECT COUNT(*) as count FROM clients WHERE deleted_at IS NULL").get();
    console.log('Total clients:', clientCount.count);

    // Get sample clients
    const clients = db.prepare("SELECT id, name, email, customer_type, created_at FROM clients WHERE deleted_at IS NULL LIMIT 5").all();
    console.log('Sample clients:', clients);
  }

  // Check if clients_fts table exists
  const ftsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='clients_fts';").get();
  console.log('Clients FTS table exists:', !!ftsExists);

  db.close();
} catch (error) {
  console.error('Database error:', error.message);
}