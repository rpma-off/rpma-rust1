const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.env.APPDATA || process.env.HOME, 'com.rpma.ppf-intervention', 'rpma.db');

try {
  const db = new Database(dbPath, { readonly: true });

  // Check tasks table
  const taskCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE deleted_at IS NULL").get();
  console.log('Total tasks:', taskCount.count);

  // Check if tasks have client_id
  const tasksWithClient = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE client_id IS NOT NULL AND deleted_at IS NULL").get();
  console.log('Tasks with client_id:', tasksWithClient.count);

  // Get sample tasks with client info
  const tasks = db.prepare(`
    SELECT t.id, t.title, t.client_id, t.status, c.name as client_name
    FROM tasks t
    LEFT JOIN clients c ON t.client_id = c.id
    WHERE t.deleted_at IS NULL
    LIMIT 5
  `).all();
  console.log('Sample tasks with client info:', tasks);

  // Check specific client IDs from our earlier query
  const clientIds = ['43900479-0e94-43c3-a8b2-9a30b19fa249', '95adde85-92a9-4543-817d-40e48e0c5ca4'];
  for (const clientId of clientIds) {
    const clientTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE client_id = ? AND deleted_at IS NULL").get(clientId);
    console.log(`Tasks for client ${clientId}:`, clientTasks.count);
  }

  db.close();
} catch (error) {
  console.error('Database error:', error.message);
}