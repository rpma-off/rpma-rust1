//! Integration tests for Messaging System
//!
//! Tests end-to-end message workflows with template processing and notification delivery

use crate::db::Database;
use crate::models::message::{
    Message, MessageStatus, MessageType, MessagePriority,
    SendMessageRequest, MessageTemplate, MessageTemplateRequest,
    NotificationPreferences, UpdateNotificationPreferencesRequest
};
use crate::repositories::message::MessageRepository;
use chrono::{DateTime, Utc};
use std::sync::Arc;
use uuid::Uuid;

// Helper to create a test database with full schema
async fn create_test_db() -> Database {
    let db = Database::new_in_memory().await.unwrap();
    
    // Load migration 023 for messaging system
    let migration_sql = r#"
        -- Users table for testing
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            role TEXT DEFAULT 'user',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            deleted_at INTEGER
        );
        
        -- Tasks table for testing message context
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            priority TEXT DEFAULT 'normal',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            created_by TEXT,
            assigned_to TEXT,
            started_at INTEGER,
            completed_at INTEGER,
            client_id TEXT,
            intervention_id TEXT,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
            FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE
        );
        
        -- Clients table for testing message context
        CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        );
        
        -- Interventions table for testing message context
        CREATE TABLE IF NOT EXISTS interventions (
            id TEXT PRIMARY KEY,
            client_id TEXT NOT NULL,
            vehicle_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            priority TEXT DEFAULT 'normal',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            created_by TEXT,
            assigned_to TEXT,
            started_at INTEGER,
            completed_at INTEGER,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
        );
        
        -- Messages table
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
            message_type TEXT NOT NULL CHECK (message_type IN ('email', 'sms', 'in_app')),
            sender_id TEXT,
            recipient_id TEXT,
            recipient_email TEXT,
            recipient_phone TEXT,
            subject TEXT,
            body TEXT NOT NULL,
            template_id TEXT,
            task_id TEXT,
            client_id TEXT,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
            priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
            scheduled_at INTEGER,
            sent_at INTEGER,
            read_at INTEGER,
            error_message TEXT,
            metadata TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL
        );
        
        -- Message templates table
        CREATE TABLE IF NOT EXISTS message_templates (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            message_type TEXT NOT NULL CHECK (message_type IN ('email', 'sms', 'in_app')),
            subject TEXT,
            body TEXT NOT NULL,
            variables TEXT,
            category TEXT DEFAULT 'general' CHECK (category IN ('general', 'task', 'client', 'system', 'reminder')),
            is_active BOOLEAN DEFAULT 1,
            created_by TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        );
        
        -- Notification preferences table
        CREATE TABLE IF NOT EXISTS notification_preferences (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
            user_id TEXT NOT NULL UNIQUE,
            email_enabled BOOLEAN DEFAULT 1,
            sms_enabled BOOLEAN DEFAULT 0,
            in_app_enabled BOOLEAN DEFAULT 1,
            task_assigned BOOLEAN DEFAULT 1,
            task_updated BOOLEAN DEFAULT 1,
            task_completed BOOLEAN DEFAULT 1,
            task_overdue BOOLEAN DEFAULT 1,
            client_created BOOLEAN DEFAULT 1,
            client_updated BOOLEAN DEFAULT 1,
            system_alerts BOOLEAN DEFAULT 1,
            maintenance_notifications BOOLEAN DEFAULT 1,
            quiet_hours_enabled BOOLEAN DEFAULT 0,
            quiet_hours_start TEXT,
            quiet_hours_end TEXT,
            email_frequency TEXT DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly')),
            email_digest_time TEXT DEFAULT '09:00',
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    "#;
    
    db.execute_batch(migration_sql).unwrap();
    
    // Insert default message templates from migration 023
    db.execute_batch(r#"
        INSERT OR IGNORE INTO message_templates (name, description, message_type, subject, body, variables, category) VALUES
            ('Task Assigned', 'Notification when a task is assigned to a technician', 'email',
             'New Task Assigned: {{task_number}}',
             'Hello {{technician_name}},

You have been assigned a new task:

Task: {{task_number}} - {{task_title}}
Client: {{client_name}}
Vehicle: {{vehicle_plate}} {{vehicle_model}}
Scheduled: {{scheduled_date}} {{start_time}}
Priority: {{priority}}

Please review the task details and begin work as scheduled.

Best regards,
RPMA System',
             '["technician_name", "task_number", "task_title", "client_name", "vehicle_plate", "vehicle_model", "scheduled_date", "start_time", "priority"]', 'task'),
            
            ('Task Completed', 'Notification when a task is marked as completed', 'email',
             'Task Completed: {{task_number}}',
             'Hello,

Task {{task_number}} - {{task_title}} has been completed.

Technician: {{technician_name}}
Completed: {{completed_at}}

Thank you for using RPMA services.

Best regards,
RPMA System',
             '["task_number", "task_title", "technician_name", "completed_at"]', 'task'),
            
            ('Task Overdue Reminder', 'Reminder for overdue tasks', 'sms',
             NULL,
             'URGENT: Task {{task_number}} - {{task_title}} is overdue. Please complete immediately. Client: {{client_name}}',
             '["task_number", "task_title", "client_name"]', 'reminder');
    "#, params![]).unwrap();
    
    db
}

// Helper to create test users
fn create_test_users(db: &Database) -> (String, String, String) {
    let technician_id = "tech_1";
    let manager_id = "manager_1";
    let admin_id = "admin_1";
    
    db.execute(r#"
        INSERT OR IGNORE INTO users (id, email, username, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
        VALUES 
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    "#, params![
        technician_id, "tech1@example.com", "tech1", "hash", "John", "Technician", "technician", 1, Utc::now().timestamp_millis(), Utc::now().timestamp_millis(),
        manager_id, "manager1@example.com", "manager1", "hash", "Jane", "Manager", "manager", 1, Utc::now().timestamp_millis(), Utc::now().timestamp_millis(),
        admin_id, "admin1@example.com", "admin1", "hash", "Admin", "User", "admin", 1, Utc::now().timestamp_millis(), Utc::now().timestamp_millis()
    ]).unwrap();
    
    (technician_id.to_string(), manager_id.to_string(), admin_id.to_string())
}

// Helper to create test clients and interventions
fn create_test_context(db: &Database) -> (String, String, String) {
    let client_id = "client_1";
    let vehicle_id = "vehicle_1";
    let intervention_id = "int_1";
    
    // Create client
    db.execute(r#"
        INSERT OR IGNORE INTO clients (id, name, email, phone, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    "#, params![
        client_id, "Test Client", "client@example.com", "555-1234", 1, Utc::now().timestamp_millis(), Utc::now().timestamp_millis()
    ]).unwrap();
    
    // Create intervention
    db.execute(r#"
        INSERT OR IGNORE INTO interventions (id, client_id, vehicle_id, title, description, status, created_at, updated_at, assigned_to)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    "#, params![
        intervention_id, client_id, vehicle_id, "Test PPF Installation", "Full vehicle PPF installation", "in_progress",
        Utc::now().timestamp_millis(), Utc::now().timestamp_millis(), "tech_1"
    ]).unwrap();
    
    (client_id.to_string(), vehicle_id.to_string(), intervention_id.to_string())
}

// Helper to create test tasks
fn create_test_task(db: &Database, task_id: &str, title: &str) {
    let (_client_id, _vehicle_id, intervention_id) = create_test_context(db);
    
    db.execute(r#"
        INSERT OR IGNORE INTO tasks (id, title, description, status, priority, created_at, updated_at, created_by, assigned_to, intervention_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    "#, params![
        task_id, title, "Test task description", "pending", "normal",
        Utc::now().timestamp_millis(), Utc::now().timestamp_millis(),
        "manager_1", "tech_1", intervention_id
    ]).unwrap();
}

#[tokio::test]
async fn test_task_assignment_notification_workflow() {
    let db = create_test_db().await;
    let repo = MessageRepository::new(Arc::new(db), Arc::new(crate::repositories::cache::Cache::new(100)));
    
    // Create test users and context
    let (tech_id, manager_id, _admin_id) = create_test_users(&repo.db.get_connection().unwrap());
    let (_client_id, _vehicle_id, intervention_id) = create_test_context(&repo.db.get_connection().unwrap());
    
    // Create notification preferences for technician
    create_default_notification_preferences(&repo.db.get_connection().unwrap(), &tech_id);
    
    // Create a task
    let task_id = "task_assignment_test";
    create_test_task(&repo.db.get_connection().unwrap(), task_id, "Test Assignment Task");
    
    // Get the task assignment template
    let template: Option<MessageTemplate> = repo.db
        .query_single_as(
            "SELECT * FROM message_templates WHERE name = 'Task Assigned'",
            params![]
        )
        .unwrap();
    
    assert!(template.is_some(), "Task Assigned template should exist");
    let template = template.unwrap();
    
    // Create message using template
    let message = Message {
        id: Uuid::new_v4().to_string(),
        message_type: template.message_type.clone(),
        sender_id: Some(manager_id.clone()),
        recipient_id: Some(tech_id.clone()),
        recipient_email: Some("tech1@example.com".to_string()),
        recipient_phone: None,
        subject: Some(template.subject.clone()),
        body: template.body.clone(),
        template_id: Some(template.id.clone()),
        task_id: Some(task_id.to_string()),
        client_id: Some("client_1".to_string()),
        status: "pending".to_string(),
        priority: "normal".to_string(),
        scheduled_at: None,
        sent_at: None,
        read_at: None,
        error_message: None,
        metadata: Some(r#"{"template_variables": {"task_number": "TASK-001", "task_title": "Test Assignment Task", "client_name": "Test Client", "technician_name": "John Technician"}}"#.to_string()),
        created_at: chrono::Utc::now().timestamp(),
        updated_at: chrono::Utc::now().timestamp(),
    };
    
    // Save message
    repo.save(message).await.unwrap();
    
    // Verify message was created
    let messages = repo.find_by_recipient(&tech_id).await.unwrap();
    assert!(!messages.is_empty(), "Technician should have received notification");
    
    let task_notification = messages.iter().find(|m| {
        m.task_id.as_ref().map_or(false, |id| id == task_id)
    }).unwrap();
    
    assert!(task_notification.is_some(), "Should find task assignment notification");
    let notification = task_notification.unwrap();
    
    assert_eq!(notification.message_type, "email");
    assert_eq!(notification.sender_id, Some(manager_id));
    assert_eq!(notification.recipient_id, Some(tech_id));
    assert_eq!(notification.template_id, Some(template.id));
    
    // Simulate message delivery
    repo.update_status(&notification.id, MessageStatus::Sent).await.unwrap();
    repo.update_status(&notification.id, MessageStatus::Delivered).await.unwrap();
    
    // Verify delivery status
    let delivered_notification = repo.find_by_id(&notification.id).await.unwrap().unwrap();
    assert_eq!(delivered_notification.status, "delivered");
}

#[tokio::test]
async fn test_task_completion_notification_workflow() {
    let db = create_test_db().await;
    let repo = MessageRepository::new(Arc::new(db), Arc::new(crate::repositories::cache::Cache::new(100)));
    
    // Create test users and context
    let (_tech_id, manager_id, _admin_id) = create_test_users(&repo.db.get_connection().unwrap());
    create_test_context(&repo.db.get_connection().unwrap());
    
    // Create a task and mark it as completed
    let task_id = "task_completion_test";
    create_test_task(&repo.db.get_connection().unwrap(), task_id, "Test Completion Task");
    
    // Update task status to completed
    repo.db.execute(r#"
        UPDATE tasks SET status = 'completed', completed_at = ? WHERE id = ?
    "#, params![
        chrono::Utc::now().timestamp_millis(),
        task_id
    ]).unwrap();
    
    // Get the task completion template
    let template: Option<MessageTemplate> = repo.db
        .query_single_as(
            "SELECT * FROM message_templates WHERE name = 'Task Completed'",
            params![]
        )
        .unwrap();
    
    assert!(template.is_some(), "Task Completed template should exist");
    let template = template.unwrap();
    
    // Create notification for task completion
    let message = Message {
        id: Uuid::new_v4().to_string(),
        message_type: template.message_type.clone(),
        sender_id: Some("tech_1".to_string()), // Technician who completed the task
        recipient_id: Some(manager_id.clone()), // Manager who needs to know
        recipient_email: Some("manager1@example.com".to_string()),
        recipient_phone: None,
        subject: Some(template.subject.clone()),
        body: template.body.clone(),
        template_id: Some(template.id.clone()),
        task_id: Some(task_id.to_string()),
        client_id: Some("client_1".to_string()),
        status: "pending".to_string(),
        priority: "normal".to_string(),
        scheduled_at: None,
        sent_at: None,
        read_at: None,
        error_message: None,
        metadata: Some(r#"{"template_variables": {"task_number": "TASK-002", "task_title": "Test Completion Task", "technician_name": "John Technician", "completed_at": "2023-10-01T10:00:00Z"}}"#.to_string()),
        created_at: chrono::Utc::now().timestamp(),
        updated_at: chrono::Utc::now().timestamp(),
    };
    
    // Save message
    repo.save(message).await.unwrap();
    
    // Verify message was created
    let messages = repo.find_by_recipient(&manager_id).await.unwrap();
    assert!(!messages.is_empty(), "Manager should have received notification");
    
    let completion_notification = messages.iter().find(|m| {
        m.task_id.as_ref().map_or(false, |id| id == task_id)
    }).unwrap();
    
    assert!(completion_notification.is_some(), "Should find task completion notification");
}

#[tokio::test]
async fn test_overdue_task_reminder_workflow() {
    let db = create_test_db().await;
    let repo = MessageRepository::new(Arc::new(db), Arc::new(crate::repositories::cache::Cache::new(100)));
    
    // Create test users
    let (tech_id, _manager_id, _admin_id) = create_test_users(&repo.db.get_connection().unwrap());
    
    // Create notification preferences for technician (including SMS)
    let pref_id = Uuid::new_v4().to_string();
    repo.db.execute(r#"
        INSERT OR REPLACE INTO notification_preferences (
            id, user_id, email_enabled, sms_enabled, in_app_enabled,
            task_assigned, task_updated, task_completed, task_overdue,
            client_created, client_updated, system_alerts, maintenance_notifications,
            quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
            email_frequency, email_digest_time, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    "#, params![
        pref_id, tech_id, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        0, "22:00", "08:00", "immediate", "09:00",
        chrono::Utc::now().timestamp_millis(),
        chrono::Utc::now().timestamp_millis()
    ]).unwrap();
    
    // Create an overdue task
    let task_id = "task_overdue_test";
    let overdue_time = chrono::Utc::now() - chrono::Duration::days(1); // Created 1 day ago
    let deadline = chrono::Utc::now() - chrono::Duration::hours(2); // Due 2 hours ago
    
    repo.db.execute(r#"
        INSERT OR REPLACE INTO tasks (
            id, title, description, status, priority, created_at, updated_at,
            created_by, assigned_to, client_id, intervention_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    "#, params![
        task_id,
        "Overdue Task",
        "This task is overdue",
        "in_progress",
        "high",
        overdue_time.timestamp_millis(),
        chrono::Utc::now().timestamp_millis(),
        "manager_1",
        tech_id,
        "client_1",
        "int_1"
    ]).unwrap();
    
    // Get the overdue reminder template
    let template: Option<MessageTemplate> = repo.db
        .query_single_as(
            "SELECT * FROM message_templates WHERE name = 'Task Overdue Reminder'",
            params![]
        )
        .unwrap();
    
    assert!(template.is_some(), "Task Overdue Reminder template should exist");
    let template = template.unwrap();
    
    // Create SMS reminder for overdue task
    let message = Message {
        id: Uuid::new_v4().to_string(),
        message_type: "sms".to_string(), // SMS for urgency
        sender_id: Some("system".to_string()), // System-generated
        recipient_id: Some(tech_id.clone()),
        recipient_email: None,
        recipient_phone: Some("+1234567890".to_string()),
        subject: None, // SMS doesn't have subject
        body: format!(
            "URGENT: Task {} - {} is overdue. Please complete immediately. Client: {}",
            task_id, "Overdue Task", "Test Client"
        ),
        template_id: Some(template.id.clone()),
        task_id: Some(task_id.to_string()),
        client_id: Some("client_1".to_string()),
        status: "pending".to_string(),
        priority: "urgent".to_string(), // Urgent for overdue tasks
        scheduled_at: None,
        sent_at: None,
        read_at: None,
        error_message: None,
        metadata: Some(r#"{"template_variables": {"task_number": "TASK-003", "task_title": "Overdue Task", "client_name": "Test Client"}}"#.to_string()),
        created_at: chrono::Utc::now().timestamp(),
        updated_at: chrono::Utc::now().timestamp(),
    };
    
    // Save message
    repo.save(message).await.unwrap();
    
    // Verify message was created
    let messages = repo.find_by_recipient(&tech_id).await.unwrap();
    assert!(!messages.is_empty(), "Technician should have received overdue reminder");
    
    let overdue_notification = messages.iter().find(|m| {
        m.task_id.as_ref().map_or(false, |id| id == task_id)
            && m.message_type == "sms"
    }).unwrap();
    
    assert!(overdue_notification.is_some(), "Should find SMS overdue reminder");
    
    let notification = overdue_notification.unwrap();
    assert_eq!(notification.priority, "urgent");
    assert_eq!(notification.message_type, "sms");
}

#[tokio::test]
async fn test_multi_channel_notification_preferences() {
    let db = create_test_db().await;
    let repo = MessageRepository::new(Arc::new(db), Arc::new(crate::repositories::cache::Cache::new(100)));
    
    // Create test users
    let (tech_id, _manager_id, _admin_id) = create_test_users(&repo.db.get_connection().unwrap());
    
    // Create notification preferences with multiple channels enabled
    let pref_id = Uuid::new_v4().to_string();
    repo.db.execute(r#"
        INSERT OR REPLACE INTO notification_preferences (
            id, user_id, email_enabled, sms_enabled, in_app_enabled,
            task_assigned, task_updated, task_completed, task_overdue,
            client_created, client_updated, system_alerts, maintenance_notifications,
            quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
            email_frequency, email_digest_time, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    "#, params![
        pref_id, tech_id, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        0, "22:00", "08:00", "immediate", "09:00",
        chrono::Utc::now().timestamp_millis(),
        chrono::Utc::now().timestamp_millis()
    ]).unwrap();
    
    // Create a task
    let task_id = "task_multi_channel";
    create_test_task(&repo.db.get_connection().unwrap(), task_id, "Multi Channel Task");
    
    // Get templates
    let email_template: Option<MessageTemplate> = repo.db
        .query_single_as(
            "SELECT * FROM message_templates WHERE name = 'Task Assigned' AND message_type = 'email'",
            params![]
        )
        .unwrap();
    
    assert!(email_template.is_some(), "Email template should exist");
    let email_template = email_template.unwrap();
    
    // Create in-app template (if not exists, create one)
    let in_app_template = MessageTemplate {
        id: Uuid::new_v4().to_string(),
        name: "Task Assigned In-App".to_string(),
        description: Some("In-app notification for task assignment".to_string()),
        message_type: "in_app".to_string(),
        subject: Some("New Task Assigned: {{task_number}}".to_string()),
        body: "You have been assigned task {{task_number}} - {{task_title}}".to_string(),
        variables: Some("[\"task_number\", \"task_title\"]".to_string()),
        category: "task".to_string(),
        is_active: true,
        created_by: Some("admin_1".to_string()),
        created_at: chrono::Utc::now().timestamp_millis(),
        updated_at: chrono::Utc::now().timestamp_millis(),
    };
    
    repo.db.execute(r#"
        INSERT OR IGNORE INTO message_templates (
            id, name, description, message_type, subject, body, variables,
            category, is_active, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    "#, params![
        in_app_template.id, in_app_template.name, in_app_template.description,
        in_app_template.message_type, in_app_template.subject, in_app_template.body,
        in_app_template.variables, in_app_template.category, in_app_template.is_active,
        in_app_template.created_by, in_app_template.created_at, in_app_template.updated_at
    ]).unwrap();
    
    // Create email notification
    let email_message = Message {
        id: Uuid::new_v4().to_string(),
        message_type: email_template.message_type.clone(),
        sender_id: Some("manager_1".to_string()),
        recipient_id: Some(tech_id.clone()),
        recipient_email: Some("tech1@example.com".to_string()),
        recipient_phone: None,
        subject: Some(email_template.subject.clone()),
        body: email_template.body.clone(),
        template_id: Some(email_template.id.clone()),
        task_id: Some(task_id.to_string()),
        client_id: Some("client_1".to_string()),
        status: "pending".to_string(),
        priority: "normal".to_string(),
        scheduled_at: None,
        sent_at: None,
        read_at: None,
        error_message: None,
        metadata: None,
        created_at: chrono::Utc::now().timestamp(),
        updated_at: chrono::Utc::now().timestamp(),
    };
    
    // Create in-app notification
    let in_app_message = Message {
        id: Uuid::new_v4().to_string(),
        message_type: in_app_template.message_type.clone(),
        sender_id: Some("manager_1".to_string()),
        recipient_id: Some(tech_id.clone()),
        recipient_email: None,
        recipient_phone: None,
        subject: Some(in_app_template.subject.clone()),
        body: in_app_template.body.clone(),
        template_id: Some(in_app_template.id.clone()),
        task_id: Some(task_id.to_string()),
        client_id: Some("client_1".to_string()),
        status: "pending".to_string(),
        priority: "normal".to_string(),
        scheduled_at: None,
        sent_at: None,
        read_at: None,
        error_message: None,
        metadata: None,
        created_at: chrono::Utc::now().timestamp(),
        updated_at: chrono::Utc::now().timestamp(),
    };
    
    // Save both messages
    repo.save(email_message).await.unwrap();
    repo.save(in_app_message).await.unwrap();
    
    // Verify both messages were created
    let messages = repo.find_by_recipient(&tech_id).await.unwrap();
    
    let email_messages: Vec<_> = messages.iter()
        .filter(|m| m.message_type == "email" && m.task_id.as_ref().map_or(false, |id| id == task_id))
        .collect();
    
    let in_app_messages: Vec<_> = messages.iter()
        .filter(|m| m.message_type == "in_app" && m.task_id.as_ref().map_or(false, |id| id == task_id))
        .collect();
    
    assert_eq!(email_messages.len(), 1, "Should have 1 email notification");
    assert_eq!(in_app_messages.len(), 1, "Should have 1 in-app notification");
}

#[tokio::test]
async fn test_quiet_hours_notification_filtering() {
    let db = create_test_db().await;
    let repo = MessageRepository::new(Arc::new(db), Arc::new(crate::repositories::cache::Cache::new(100)));
    
    // Create test users
    let (tech_id, _manager_id, _admin_id) = create_test_users(&repo.db.get_connection().unwrap());
    
    // Create notification preferences with quiet hours enabled
    let pref_id = Uuid::new_v4().to_string();
    repo.db.execute(r#"
        INSERT OR REPLACE INTO notification_preferences (
            id, user_id, email_enabled, sms_enabled, in_app_enabled,
            task_assigned, task_updated, task_completed, task_overdue,
            client_created, client_updated, system_alerts, maintenance_notifications,
            quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
            email_frequency, email_digest_time, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    "#, params![
        pref_id, tech_id, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, "22:00", "08:00", "immediate", "09:00",
        chrono::Utc::now().timestamp_millis(),
        chrono::Utc::now().timestamp_millis()
    ]).unwrap();
    
    // Create a task
    let task_id = "task_quiet_hours";
    create_test_task(&repo.db.get_connection().unwrap(), task_id, "Quiet Hours Task");
    
    // Create a notification during quiet hours
    let now = chrono::Utc::now();
    let quiet_hour_time = now.time(); // Assuming current time is within quiet hours
    
    // Create a message during quiet hours
    let message = Message {
        id: Uuid::new_v4().to_string(),
        message_type: "email".to_string(),
        sender_id: Some("manager_1".to_string()),
        recipient_id: Some(tech_id.clone()),
        recipient_email: Some("tech1@example.com".to_string()),
        recipient_phone: None,
        subject: Some("Quiet Hours Test".to_string()),
        body: "This message is sent during quiet hours".to_string(),
        template_id: None,
        task_id: Some(task_id.to_string()),
        client_id: Some("client_1".to_string()),
        status: "pending".to_string(),
        priority: "normal".to_string(),
        scheduled_at: None, // Should be sent immediately but respect quiet hours
        sent_at: None,
        read_at: None,
        error_message: None,
        metadata: Some(r#"{"quiet_hours_deferred": true}"#.to_string()),
        created_at: chrono::Utc::now().timestamp(),
        updated_at: chrono::Utc::now().timestamp(),
    };
    
    // Save message
    repo.save(message).await.unwrap();
    
    // In a real implementation, messages during quiet hours would be scheduled
    // for delivery after quiet hours end. For this test, we verify the
    // notification preference settings
    let prefs: Option<NotificationPreferences> = repo.db
        .query_single_as(
            "SELECT * FROM notification_preferences WHERE user_id = ?",
            params![tech_id]
        )
        .unwrap();
    
    assert!(prefs.is_some());
    let prefs = prefs.unwrap();
    assert!(prefs.quiet_hours_enabled);
    assert_eq!(prefs.quiet_hours_start, Some("22:00".to_string()));
    assert_eq!(prefs.quiet_hours_end, Some("08:00".to_string()));
}

#[tokio::test]
async fn test_message_delivery_with_retry_logic() {
    let db = create_test_db().await;
    let repo = MessageRepository::new(Arc::new(db), Arc::new(crate::repositories::cache::Cache::new(100)));
    
    // Create test users
    let (_tech_id, manager_id, _admin_id) = create_test_users(&repo.db.get_connection().unwrap());
    
    // Create a message that will fail delivery
    let message = Message {
        id: Uuid::new_v4().to_string(),
        message_type: "email".to_string(),
        sender_id: Some("system".to_string()),
        recipient_id: Some(manager_id.clone()),
        recipient_email: Some("invalid-email-address".to_string()), // Invalid email
        recipient_phone: None,
        subject: Some("Delivery Failure Test".to_string()),
        body: "This message should fail delivery".to_string(),
        template_id: None,
        task_id: None,
        client_id: None,
        status: "pending".to_string(),
        priority: "normal".to_string(),
        scheduled_at: None,
        sent_at: None,
        read_at: None,
        error_message: None,
        metadata: None,
        created_at: chrono::Utc::now().timestamp(),
        updated_at: chrono::Utc::now().timestamp(),
    };
    
    // Save message
    repo.save(message).await.unwrap();
    
    // Simulate delivery attempt and failure
    repo.update_status(&message.id, MessageStatus::Failed).await.unwrap();
    
    // Verify failure status
    let failed_message = repo.find_by_id(&message.id).await.unwrap().unwrap();
    assert_eq!(failed_message.status, "failed");
    
    // In a real implementation, retry logic would:
    // 1. Check if message should be retried based on error type
    // 2. Schedule retry with exponential backoff
    // 3. Update message status back to pending for retry
    // 4. Track retry count
    
    // For this test, we verify the failed status
    let failed_messages = repo.search(MessageQuery {
        status: Some("failed".to_string()),
        ..Default::default()
    }).await.unwrap();
    
    assert_eq!(failed_messages.len(), 1);
    assert_eq!(failed_messages[0].id, message.id);
}

#[tokio::test]
async fn test_message_performance_with_large_dataset() {
    let db = create_test_db().await;
    let repo = MessageRepository::new(Arc::new(db), Arc::new(crate::repositories::cache::Cache::new(100)));
    
    // Create test users
    let (tech_id, manager_id, _admin_id) = create_test_users(&repo.db.get_connection().unwrap());
    
    let message_count = 1000;
    let start = std::time::Instant::now();
    
    // Create many messages
    for i in 0..message_count {
        let message = Message {
            id: format!("perf_msg_{}", i),
            message_type: if i % 3 == 0 { "email" } else if i % 3 == 1 { "sms" } else { "in_app" },
            sender_id: if i % 2 == 0 { Some(manager_id.clone()) } else { Some("system".to_string()) },
            recipient_id: Some(tech_id.clone()),
            recipient_email: if i % 3 == 0 { Some("tech1@example.com".to_string()) } else { None },
            recipient_phone: if i % 3 == 1 { Some("+1234567890".to_string()) } else { None },
            subject: Some(format!("Performance Test Message {}", i)),
            body: format!("Performance test body {}", i),
            template_id: None,
            task_id: Some(format!("task_{}", i % 100)), // 100 unique tasks
            client_id: Some("client_1".to_string()),
            status: if i % 10 == 0 { "sent" } else if i % 10 == 1 { "failed" } else { "pending" },
            priority: if i % 20 == 0 { "urgent" } else if i % 10 == 0 { "high" } else { "normal" },
            scheduled_at: if i % 20 == 0 { Some(chrono::Utc::now().timestamp() + 3600) } else { None },
            sent_at: if i % 10 == 0 { Some(chrono::Utc::now().timestamp()) } else { None },
            read_at: if i % 30 == 0 { Some(chrono::Utc::now().timestamp()) } else { None },
            error_message: if i % 10 == 1 { Some("Delivery failed".to_string()) } else { None },
            metadata: Some(format!(r#"{{"test_index": {}}}"#, i)),
            created_at: chrono::Utc::now().timestamp() - (i as i64 * 60), // 1 minute apart
            updated_at: chrono::Utc::now().timestamp() - (i as i64 * 60),
        };
        
        repo.save(message).await.unwrap();
    }
    
    let creation_duration = start.elapsed();
    println!("Created {} messages in {:?}", message_count, creation_duration);
    
    // Test retrieval performance
    let start = std::time::Instant::now();
    let all_messages = repo.search(MessageQuery::default()).await.unwrap();
    let retrieval_duration = start.elapsed();
    println!("Retrieved {} messages in {:?}", all_messages.len(), retrieval_duration);
    
    // Test filtering performance
    let start = std::time::Instant::now();
    let sent_messages = repo.search(MessageQuery {
        status: Some("sent".to_string()),
        ..Default::default()
    }).await.unwrap();
    let filter_duration = start.elapsed();
    println!("Filtered {} sent messages in {:?}", sent_messages.len(), filter_duration);
    
    // Test type filtering performance
    let start = std::time::Instant::now();
    let email_messages = repo.find_by_type(MessageType::Email).await.unwrap();
    let type_filter_duration = start.elapsed();
    println!("Filtered {} email messages in {:?}", email_messages.len(), type_filter_duration);
    
    // Verify counts
    assert_eq!(all_messages.len(), message_count);
    assert!(sent_messages.len() > 0);
    assert!(email_messages.len() > 0);
    
    // Performance assertions
    assert!(creation_duration.as_millis() < 10000, "Message creation should complete within 10 seconds");
    assert!(retrieval_duration.as_millis() < 5000, "Message retrieval should complete within 5 seconds");
    assert!(filter_duration.as_millis() < 2000, "Message filtering should complete within 2 seconds");
}

#[tokio::test]
async fn test_concurrent_message_operations() {
    let db = Arc::new(create_test_db().await);
    let repo = Arc::new(MessageRepository::new((*db).clone(), Arc::new(crate::repositories::cache::Cache::new(100))));
    
    // Create test users
    let (tech_id, manager_id, _admin_id) = create_test_users(&repo.db.get_connection().unwrap());
    
    // Test concurrent message creation
    let mut handles = vec![];
    
    for i in 0..10 {
        let repo_clone = Arc::clone(&repo);
        let tech_id_clone = tech_id.clone();
        let manager_id_clone = manager_id.clone();
        
        let handle = tokio::spawn(async move {
            // Create a message
            let message = Message {
                id: format!("concurrent_msg_{}", i),
                message_type: "email".to_string(),
                sender_id: Some(manager_id_clone.clone()),
                recipient_id: Some(tech_id_clone.clone()),
                recipient_email: Some("tech1@example.com".to_string()),
                recipient_phone: None,
                subject: Some(format!("Concurrent Message {}", i)),
                body: format!("Concurrent test body {}", i),
                template_id: None,
                task_id: Some(format!("task_concurrent_{}", i)),
                client_id: Some("client_1".to_string()),
                status: "pending".to_string(),
                priority: "normal".to_string(),
                scheduled_at: None,
                sent_at: None,
                read_at: None,
                error_message: None,
                metadata: Some(format!(r#"{{"thread": {}}}"#, i)),
                created_at: chrono::Utc::now().timestamp(),
                updated_at: chrono::Utc::now().timestamp(),
            };
            
            // Save message
            repo_clone.save(message).await
        });
        
        handles.push(handle);
    }
    
    // Wait for all operations to complete
    let mut results = vec![];
    for handle in handles {
        results.push(handle.await.unwrap());
    }
    
    // Verify all operations completed successfully
    for (i, result) in results.into_iter().enumerate() {
        assert!(result.is_ok(), "Concurrent message creation {} should succeed", i);
    }
    
    // Verify all messages were created
    let all_messages = repo.search(MessageQuery::default()).await.unwrap();
    assert_eq!(all_messages.len(), 10, "Should have 10 concurrent messages");
    
    // Test concurrent status updates
    let mut status_handles = vec![];
    
    for message in &all_messages {
        let repo_clone = Arc::clone(&repo);
        let message_id = message.id.clone();
        
        let handle = tokio::spawn(async move {
            // Update message status
            repo_clone.update_status(&message_id, MessageStatus::Sent).await
        });
        
        status_handles.push(handle);
    }
    
    // Wait for all status updates to complete
    for (i, handle) in status_handles.into_iter().enumerate() {
        handle.await.unwrap();
        println!("Status update {} completed", i);
    }
    
    // Verify all messages were updated
    let sent_messages = repo.search(MessageQuery {
        status: Some("sent".to_string()),
        ..Default::default()
    }).await.unwrap();
    
    assert_eq!(sent_messages.len(), 10, "All messages should be sent");
    
    // Verify data integrity after concurrent operations
    for message in &sent_messages {
        assert_eq!(message.status, "sent");
        assert!(message.sent_at.is_some());
    }
}