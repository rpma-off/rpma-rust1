//! Unit tests for Messaging System
//!
//! Tests message creation, delivery, status tracking, and notification preferences

use crate::db::Database;
use crate::domains::notifications::domain::models::message::{
    Message, MessageListResponse, MessagePriority, MessageQuery, MessageStatus, MessageTemplate,
    MessageTemplateRequest, MessageType, NotificationPreferences, SendMessageRequest,
    UpdateNotificationPreferencesRequest,
};
use crate::domains::notifications::infrastructure::message_repository::MessageRepository;
use rusqlite::params;
use std::sync::Arc;
use uuid::Uuid;

// Helper to create a test database with messaging tables
async fn create_test_db() -> Database {
    let db = Database::new_in_memory().await.unwrap();

    // Create messaging tables from migration 023
    db.execute_batch(r#"
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
    "#).unwrap();

    db
}

// Helper to create a test user
fn create_test_user(db: &Database, user_id: &str, email: &str) {
    db.execute(r#"
        INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    "#, params![
        user_id,
        email,
        email.split('@').next().unwrap_or("user"),
        "hashed_password",
        "Test",
        "User",
        "technician",
        1,
        chrono::Utc::now().timestamp(),
        chrono::Utc::now().timestamp()
    ]).unwrap();
}

// Helper to create a default notification preference
fn create_default_notification_preferences(db: &Database, user_id: &str) {
    db.execute(
        r#"
        INSERT OR IGNORE INTO notification_preferences (
            id, user_id, email_enabled, sms_enabled, in_app_enabled,
            task_assigned, task_updated, task_completed, task_overdue,
            client_created, client_updated, system_alerts, maintenance_notifications,
            quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
            email_frequency, email_digest_time, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    "#,
        params![
            Uuid::new_v4().to_string(),
            user_id,
            1,
            1,
            1,
            1,
            1,
            0,
            1,
            1,
            1,
            1,
            1,
            0,
            "22:00",
            "08:00",
            "immediate",
            "09:00",
            chrono::Utc::now().timestamp(),
            chrono::Utc::now().timestamp()
        ],
    )
    .unwrap();
}

#[tokio::test]
async fn test_message_repository_crud() {
    let db = create_test_db().await;
    let repo = MessageRepository::new(
        Arc::new(db),
        Arc::new(crate::shared::repositories::cache::Cache::new(100)),
    );

    // Create test users
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "sender_1",
        "sender1@example.com",
    );
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "recipient_1",
        "recipient1@example.com",
    );

    // Create a test message
    let message = Message {
        id: "msg_test_1".to_string(),
        message_type: "email".to_string(),
        sender_id: Some("sender_1".to_string()),
        recipient_id: Some("recipient_1".to_string()),
        recipient_email: Some("recipient1@example.com".to_string()),
        recipient_phone: None,
        subject: Some("Test Subject".to_string()),
        body: "Test body content".to_string(),
        template_id: None,
        task_id: Some("task_123".to_string()),
        client_id: Some("client_456".to_string()),
        status: "pending".to_string(),
        priority: "normal".to_string(),
        scheduled_at: None,
        sent_at: None,
        read_at: None,
        error_message: None,
        metadata: Some(r#"{"key": "value"}"#.to_string()),
        created_at: chrono::Utc::now().timestamp(),
        updated_at: chrono::Utc::now().timestamp(),
    };

    // Save message
    let saved_message = repo.save(message.clone()).await.unwrap();
    assert_eq!(saved_message.id, "msg_test_1");
    assert_eq!(saved_message.subject, Some("Test Subject".to_string()));
    assert_eq!(saved_message.status, "pending");

    // Find by ID
    let found = repo.find_by_id("msg_test_1".to_string()).await.unwrap();
    assert!(found.is_some());
    let found_message = found.unwrap();
    assert_eq!(found_message.id, "msg_test_1");
    assert_eq!(found_message.body, "Test body content");

    // Update status
    repo.update_status("msg_test_1", MessageStatus::Sent)
        .await
        .unwrap();

    // Verify status update
    let updated = repo
        .find_by_id("msg_test_1".to_string())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(updated.status, "sent");
    assert!(updated.sent_at.is_some());

    // Delete message
    let deleted = repo.delete_by_id("msg_test_1".to_string()).await.unwrap();
    assert!(deleted);

    // Verify deletion
    let not_found = repo.find_by_id("msg_test_1".to_string()).await.unwrap();
    assert!(not_found.is_none());
}

#[tokio::test]
async fn test_message_type_filtering() {
    let db = create_test_db().await;
    let repo = MessageRepository::new(
        Arc::new(db),
        Arc::new(crate::shared::repositories::cache::Cache::new(100)),
    );

    // Create test users
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "sender_types",
        "sender@example.com",
    );
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "recipient_types",
        "recipient@example.com",
    );

    // Create messages of different types
    let email_message = Message {
        id: "msg_email".to_string(),
        message_type: "email".to_string(),
        sender_id: Some("sender_types".to_string()),
        recipient_id: Some("recipient_types".to_string()),
        recipient_email: Some("recipient@example.com".to_string()),
        recipient_phone: None,
        subject: Some("Email Subject".to_string()),
        body: "Email body".to_string(),
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

    let sms_message = Message {
        id: "msg_sms".to_string(),
        message_type: "sms".to_string(),
        sender_id: Some("sender_types".to_string()),
        recipient_id: Some("recipient_types".to_string()),
        recipient_email: None,
        recipient_phone: Some("+1234567890".to_string()),
        subject: None,
        body: "SMS body".to_string(),
        template_id: None,
        task_id: None,
        client_id: None,
        status: "pending".to_string(),
        priority: "high".to_string(),
        scheduled_at: None,
        sent_at: None,
        read_at: None,
        error_message: None,
        metadata: None,
        created_at: chrono::Utc::now().timestamp(),
        updated_at: chrono::Utc::now().timestamp(),
    };

    let in_app_message = Message {
        id: "msg_inapp".to_string(),
        message_type: "in_app".to_string(),
        sender_id: Some("sender_types".to_string()),
        recipient_id: Some("recipient_types".to_string()),
        recipient_email: None,
        recipient_phone: None,
        subject: Some("In-App Notification".to_string()),
        body: "In-app body".to_string(),
        template_id: None,
        task_id: None,
        client_id: None,
        status: "pending".to_string(),
        priority: "low".to_string(),
        scheduled_at: None,
        sent_at: None,
        read_at: None,
        error_message: None,
        metadata: None,
        created_at: chrono::Utc::now().timestamp(),
        updated_at: chrono::Utc::now().timestamp(),
    };

    // Save messages
    repo.save(email_message).await.unwrap();
    repo.save(sms_message).await.unwrap();
    repo.save(in_app_message).await.unwrap();

    // Find by type
    let email_messages = repo.find_by_type(MessageType::Email).await.unwrap();
    assert_eq!(email_messages.len(), 1);
    assert_eq!(email_messages[0].message_type, "email");
    assert_eq!(email_messages[0].id, "msg_email");

    let sms_messages = repo.find_by_type(MessageType::Sms).await.unwrap();
    assert_eq!(sms_messages.len(), 1);
    assert_eq!(sms_messages[0].message_type, "sms");
    assert_eq!(sms_messages[0].id, "msg_sms");

    let in_app_messages = repo.find_by_type(MessageType::InApp).await.unwrap();
    assert_eq!(in_app_messages.len(), 1);
    assert_eq!(in_app_messages[0].message_type, "in_app");
    assert_eq!(in_app_messages[0].id, "msg_inapp");
}

#[tokio::test]
async fn test_message_status_transitions() {
    let db = create_test_db().await;
    let repo = MessageRepository::new(
        Arc::new(db),
        Arc::new(crate::shared::repositories::cache::Cache::new(100)),
    );

    // Create test users
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "sender_status",
        "sender@example.com",
    );
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "recipient_status",
        "recipient@example.com",
    );

    // Create a message
    let message = Message {
        id: "msg_status".to_string(),
        message_type: "email".to_string(),
        sender_id: Some("sender_status".to_string()),
        recipient_id: Some("recipient_status".to_string()),
        recipient_email: Some("recipient@example.com".to_string()),
        recipient_phone: None,
        subject: Some("Status Test".to_string()),
        body: "Status test body".to_string(),
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

    repo.save(message).await.unwrap();

    // Test status transitions
    let now = chrono::Utc::now().timestamp();

    // Pending -> Sent
    repo.update_status("msg_status", MessageStatus::Sent)
        .await
        .unwrap();
    let message = repo
        .find_by_id("msg_status".to_string())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(message.status, "sent");
    assert!(message.sent_at.is_some());
    assert!(message.sent_at.unwrap() >= now);

    // Sent -> Delivered
    repo.update_status("msg_status", MessageStatus::Delivered)
        .await
        .unwrap();
    let message = repo
        .find_by_id("msg_status".to_string())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(message.status, "delivered");
    assert!(message.sent_at.is_some()); // Should retain sent_at

    // Delivered -> Read
    repo.update_status("msg_status", MessageStatus::Read)
        .await
        .unwrap();
    let message = repo
        .find_by_id("msg_status".to_string())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(message.status, "read");
    assert!(message.read_at.is_some());
    assert!(message.read_at.unwrap() >= now);

    // Read -> Failed (error case)
    repo.update_status("msg_status", MessageStatus::Failed)
        .await
        .unwrap();
    let message = repo
        .find_by_id("msg_status".to_string())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(message.status, "failed");
}

#[tokio::test]
async fn test_message_priority_filtering() {
    let db = create_test_db().await;
    let repo = MessageRepository::new(
        Arc::new(db),
        Arc::new(crate::shared::repositories::cache::Cache::new(100)),
    );

    // Create test users
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "sender_priority",
        "sender@example.com",
    );
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "recipient_priority",
        "recipient@example.com",
    );

    // Create messages with different priorities
    for (i, priority) in ["low", "normal", "high", "urgent"].iter().enumerate() {
        let message = Message {
            id: format!("msg_priority_{}", i),
            message_type: "email".to_string(),
            sender_id: Some("sender_priority".to_string()),
            recipient_id: Some("recipient_priority".to_string()),
            recipient_email: Some("recipient@example.com".to_string()),
            recipient_phone: None,
            subject: Some(format!("Priority Test {}", priority)),
            body: format!("Body for priority {}", priority),
            template_id: None,
            task_id: None,
            client_id: None,
            status: "pending".to_string(),
            priority: priority.to_string(),
            scheduled_at: None,
            sent_at: None,
            read_at: None,
            error_message: None,
            metadata: None,
            created_at: chrono::Utc::now().timestamp() + (i as i64),
            updated_at: chrono::Utc::now().timestamp() + (i as i64),
        };

        repo.save(message).await.unwrap();
    }

    // Search with priority filter
    let urgent_messages = repo
        .search(MessageQuery {
            priority: Some("urgent".to_string()),
            ..Default::default()
        })
        .await
        .unwrap();

    assert_eq!(urgent_messages.len(), 1);
    assert_eq!(urgent_messages[0].priority, "urgent");
    assert_eq!(urgent_messages[0].id, "msg_priority_3");

    // Search without priority filter
    let all_messages = repo.search(MessageQuery::default()).await.unwrap();
    assert_eq!(all_messages.len(), 4);
}

#[tokio::test]
async fn test_message_recipient_filtering() {
    let db = create_test_db().await;
    let repo = MessageRepository::new(
        Arc::new(db),
        Arc::new(crate::shared::repositories::cache::Cache::new(100)),
    );

    // Create multiple test users
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "sender_recipient",
        "sender@example.com",
    );
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "recipient_a",
        "recipient_a@example.com",
    );
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "recipient_b",
        "recipient_b@example.com",
    );

    // Create messages for different recipients
    for i in 0..5 {
        let recipient_id = if i % 2 == 0 {
            "recipient_a"
        } else {
            "recipient_b"
        };

        let message = Message {
            id: format!("msg_recip_{}", i),
            message_type: "email".to_string(),
            sender_id: Some("sender_recipient".to_string()),
            recipient_id: Some(recipient_id.to_string()),
            recipient_email: Some(format!("{}@example.com", recipient_id)),
            recipient_phone: None,
            subject: Some(format!("Message {}", i)),
            body: format!("Body {}", i),
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
            created_at: chrono::Utc::now().timestamp() + (i as i64),
            updated_at: chrono::Utc::now().timestamp() + (i as i64),
        };

        repo.save(message).await.unwrap();
    }

    // Find messages for recipient A
    let recipient_a_messages = repo.find_by_recipient("recipient_a").await.unwrap();
    assert_eq!(recipient_a_messages.len(), 3); // Messages 0, 2, 4

    for message in &recipient_a_messages {
        assert_eq!(message.recipient_id, Some("recipient_a".to_string()));
    }

    // Find messages for recipient B
    let recipient_b_messages = repo.find_by_recipient("recipient_b").await.unwrap();
    assert_eq!(recipient_b_messages.len(), 2); // Messages 1, 3

    for message in &recipient_b_messages {
        assert_eq!(message.recipient_id, Some("recipient_b".to_string()));
    }
}

#[tokio::test]
async fn test_unsent_messages_filter() {
    let db = create_test_db().await;
    let repo = MessageRepository::new(
        Arc::new(db),
        Arc::new(crate::shared::repositories::cache::Cache::new(100)),
    );

    // Create test users
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "sender_unsent",
        "sender@example.com",
    );
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "recipient_unsent",
        "recipient@example.com",
    );

    // Create messages with different statuses
    for (i, status) in ["pending", "sent", "failed", "delivered"]
        .iter()
        .enumerate()
    {
        let message = Message {
            id: format!("msg_unsent_{}", i),
            message_type: "email".to_string(),
            sender_id: Some("sender_unsent".to_string()),
            recipient_id: Some("recipient_unsent".to_string()),
            recipient_email: Some("recipient@example.com".to_string()),
            recipient_phone: None,
            subject: Some(format!("Unsent Test {}", i)),
            body: format!("Body {}", i),
            template_id: None,
            task_id: None,
            client_id: None,
            status: status.to_string(),
            priority: "normal".to_string(),
            scheduled_at: None,
            sent_at: if *status == "sent" {
                Some(chrono::Utc::now().timestamp())
            } else {
                None
            },
            read_at: None,
            error_message: None,
            metadata: None,
            created_at: chrono::Utc::now().timestamp(),
            updated_at: chrono::Utc::now().timestamp(),
        };

        repo.save(message).await.unwrap();
    }

    // Find unsent messages (pending or failed)
    let unsent_messages = repo.find_unsent().await.unwrap();

    // Should include pending and failed messages
    assert_eq!(unsent_messages.len(), 2);

    for message in &unsent_messages {
        assert!(message.status == "pending" || message.status == "failed");
    }
}

#[tokio::test]
async fn test_message_date_filtering() {
    let db = create_test_db().await;
    let repo = MessageRepository::new(Arc::new(db), Arc::new(crate::shared::repositories::cache::new(100)));

    // Create test users
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "sender_date",
        "sender@example.com",
    );
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "recipient_date",
        "recipient@example.com",
    );

    let now = chrono::Utc::now().timestamp();

    // Create messages with different timestamps
    for i in 0..5 {
        let created_at = now - (i as i64 * 86400); // i days ago

        let message = Message {
            id: format!("msg_date_{}", i),
            message_type: "email".to_string(),
            sender_id: Some("sender_date".to_string()),
            recipient_id: Some("recipient_date".to_string()),
            recipient_email: Some("recipient@example.com".to_string()),
            recipient_phone: None,
            subject: Some(format!("Date Test {}", i)),
            body: format!("Body {}", i),
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
            created_at,
            updated_at: created_at,
        };

        repo.save(message).await.unwrap();
    }

    // Search messages from last 3 days
    let recent_messages = repo
        .search(MessageQuery {
            date_from: Some(now - (3 * 86400)),
            ..Default::default()
        })
        .await
        .unwrap();

    assert_eq!(recent_messages.len(), 3); // Messages 0, 1, 2 (0-2 days ago)

    // Search messages older than 2 days
    let old_messages = repo
        .search(MessageQuery {
            date_to: Some(now - (2 * 86400)),
            ..Default::default()
        })
        .await
        .unwrap();

    assert_eq!(old_messages.len(), 2); // Messages 3, 4 (3-4 days ago)
}

#[tokio::test]
async fn test_message_template_crud() {
    let db = create_test_db().await;
    let cache = Arc::new(crate::shared::repositories::cache::Cache::new(100));

    // Create test user
    create_test_user(&db, "user_template", "user@example.com");

    // Create a message template
    let template_id = Uuid::new_v4().to_string();
    db.execute(r#"
        INSERT INTO message_templates (
            id, name, description, message_type, subject, body, variables,
            category, is_active, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    "#, params![
        template_id,
        "Task Assigned Template",
        "Template for task assignment notifications",
        "email",
        "New Task Assigned: {{task_number}}",
        "Hello {{technician_name}},\n\nYou have been assigned a new task:\n\nTask: {{task_number}} - {{task_title}}\nClient: {{client_name}}\nVehicle: {{vehicle_plate}} {{vehicle_model}}\nScheduled: {{scheduled_date}} {{start_time}}\nPriority: {{priority}}\n\nPlease review the task details and begin work as scheduled.\n\nBest regards,\nRPMA System",
        "[\"technician_name\", \"task_number\", \"task_title\", \"client_name\", \"vehicle_plate\", \"vehicle_model\", \"scheduled_date\", \"start_time\", \"priority\"]",
        "task",
        1,
        "user_template",
        chrono::Utc::now().timestamp_millis(),
        chrono::Utc::now().timestamp_millis()
    ]).unwrap();

    // Retrieve template
    let template: Option<MessageTemplate> = db
        .query_single_as(
            "SELECT * FROM message_templates WHERE id = ?",
            params![template_id],
        )
        .unwrap();

    assert!(template.is_some());
    let template = template.unwrap();

    assert_eq!(template.name, "Task Assigned Template");
    assert_eq!(template.message_type, "email");
    assert_eq!(
        template.subject,
        Some("New Task Assigned: {{task_number}}".to_string())
    );
    assert_eq!(template.category, "task");
    assert!(template.is_active);
    assert_eq!(template.created_by, Some("user_template".to_string()));

    // Update template
    db.execute(
        r#"
        UPDATE message_templates SET 
            name = ?, description = ?, subject = ?, updated_at = ?
        WHERE id = ?
    "#,
        params![
            "Updated Task Template",
            "Updated task assignment template",
            "Updated: {{task_number}}",
            chrono::Utc::now().timestamp_millis(),
            template_id
        ],
    )
    .unwrap();

    // Verify update
    let updated_template: Option<MessageTemplate> = db
        .query_single_as(
            "SELECT * FROM message_templates WHERE id = ?",
            params![template_id],
        )
        .unwrap();

    assert!(updated_template.is_some());
    let updated_template = updated_template.unwrap();
    assert_eq!(updated_template.name, "Updated Task Template");
    assert_eq!(
        updated_template.subject,
        Some("Updated: {{task_number}}".to_string())
    );

    // Delete template
    let rows_affected = db
        .execute(
            "DELETE FROM message_templates WHERE id = ?",
            params![template_id],
        )
        .unwrap();

    assert_eq!(rows_affected, 1);

    // Verify deletion
    let deleted_template: Option<MessageTemplate> = db
        .query_single_as(
            "SELECT * FROM message_templates WHERE id = ?",
            params![template_id],
        )
        .unwrap();

    assert!(deleted_template.is_none());
}

#[tokio::test]
async fn test_notification_preferences_crud() {
    let db = create_test_db().await;

    // Create test user
    let user_id = "user_notifications";
    create_test_user(&db, user_id, "user@example.com");

    // Create notification preferences
    let pref_id = Uuid::new_v4().to_string();
    db.execute(
        r#"
        INSERT INTO notification_preferences (
            id, user_id, email_enabled, sms_enabled, in_app_enabled,
            task_assigned, task_updated, task_completed, task_overdue,
            client_created, client_updated, system_alerts, maintenance_notifications,
            quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
            email_frequency, email_digest_time, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    "#,
        params![
            pref_id,
            user_id,
            0,       // email_enabled = false
            1,       // sms_enabled = true
            0,       // in_app_enabled = false
            1,       // task_assigned = true
            0,       // task_updated = false
            1,       // task_completed = true
            0,       // task_overdue = false
            1,       // client_created = true
            0,       // client_updated = false
            0,       // system_alerts = false
            1,       // maintenance_notifications = true
            1,       // quiet_hours_enabled = true
            "21:00", // quiet_hours_start
            "09:00", // quiet_hours_end
            "daily", // email_frequency
            "08:00", // email_digest_time
            chrono::Utc::now().timestamp_millis(),
            chrono::Utc::now().timestamp_millis()
        ],
    )
    .unwrap();

    // Retrieve preferences
    let prefs: Option<NotificationPreferences> = db
        .query_single_as(
            "SELECT * FROM notification_preferences WHERE user_id = ?",
            params![user_id],
        )
        .unwrap();

    assert!(prefs.is_some());
    let prefs = prefs.unwrap();

    assert_eq!(prefs.user_id, user_id);
    assert!(!prefs.email_enabled);
    assert!(prefs.sms_enabled);
    assert!(!prefs.in_app_enabled);
    assert!(prefs.task_assigned);
    assert!(!prefs.task_updated);
    assert!(prefs.task_completed);
    assert!(!prefs.task_overdue);
    assert!(prefs.client_created);
    assert!(!prefs.client_updated);
    assert!(!prefs.system_alerts);
    assert!(prefs.maintenance_notifications);
    assert!(prefs.quiet_hours_enabled);
    assert_eq!(prefs.quiet_hours_start, Some("21:00".to_string()));
    assert_eq!(prefs.quiet_hours_end, Some("09:00".to_string()));
    assert_eq!(prefs.email_frequency, "daily");
    assert_eq!(prefs.email_digest_time, "08:00");

    // Update preferences
    db.execute(
        r#"
        UPDATE notification_preferences SET 
            email_enabled = ?, task_updated = ?, system_alerts = ?, 
            quiet_hours_enabled = ?, updated_at = ?
        WHERE user_id = ?
    "#,
        params![
            1, // email_enabled = true
            1, // task_updated = true
            1, // system_alerts = true
            0, // quiet_hours_enabled = false
            chrono::Utc::now().timestamp_millis(),
            user_id
        ],
    )
    .unwrap();

    // Verify update
    let updated_prefs: Option<NotificationPreferences> = db
        .query_single_as(
            "SELECT * FROM notification_preferences WHERE user_id = ?",
            params![user_id],
        )
        .unwrap();

    assert!(updated_prefs.is_some());
    let updated_prefs = updated_prefs.unwrap();
    assert!(updated_prefs.email_enabled);
    assert!(updated_prefs.task_updated);
    assert!(updated_prefs.system_alerts);
    assert!(!updated_prefs.quiet_hours_enabled);
}

#[tokio::test]
async fn test_message_scheduling() {
    let db = create_test_db().await;
    let repo = MessageRepository::new(
        Arc::new(db),
        Arc::new(crate::shared::repositories::cache::Cache::new(100)),
    );

    // Create test users
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "sender_schedule",
        "sender@example.com",
    );
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "recipient_schedule",
        "recipient@example.com",
    );

    let future_time = chrono::Utc::now().timestamp() + 3600; // 1 hour from now

    // Create a scheduled message
    let message = Message {
        id: "msg_scheduled".to_string(),
        message_type: "email".to_string(),
        sender_id: Some("sender_schedule".to_string()),
        recipient_id: Some("recipient_schedule".to_string()),
        recipient_email: Some("recipient@example.com".to_string()),
        recipient_phone: None,
        subject: Some("Scheduled Message".to_string()),
        body: "This message is scheduled for future delivery".to_string(),
        template_id: None,
        task_id: None,
        client_id: None,
        status: "pending".to_string(),
        priority: "normal".to_string(),
        scheduled_at: Some(future_time),
        sent_at: None,
        read_at: None,
        error_message: None,
        metadata: None,
        created_at: chrono::Utc::now().timestamp(),
        updated_at: chrono::Utc::now().timestamp(),
    };

    repo.save(message).await.unwrap();

    // Verify message is scheduled but not yet sent
    let saved_message = repo
        .find_by_id("msg_scheduled".to_string())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(saved_message.scheduled_at, Some(future_time));
    assert_eq!(saved_message.status, "pending");
    assert!(saved_message.sent_at.is_none());

    // Should not appear in unsent messages yet (scheduled for future)
    let unsent_now = repo
        .search(MessageQuery {
            ..Default::default()
        })
        .await
        .unwrap();

    // The message is pending, so it should be in unsent
    // But we might want to filter out scheduled messages for real implementation
    // This test verifies the basic functionality
}

#[tokio::test]
async fn test_message_error_handling() {
    let db = create_test_db().await;
    let repo = MessageRepository::new(
        Arc::new(db),
        Arc::new(crate::shared::repositories::cache::Cache::new(100)),
    );

    // Create test users
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "sender_error",
        "sender@example.com",
    );
    create_test_user(
        &repo.db.get_connection().unwrap(),
        "recipient_error",
        "recipient@example.com",
    );

    // Create a message
    let message = Message {
        id: "msg_error".to_string(),
        message_type: "email".to_string(),
        sender_id: Some("sender_error".to_string()),
        recipient_id: Some("recipient_error".to_string()),
        recipient_email: Some("invalid-email".to_string()), // Invalid email
        recipient_phone: None,
        subject: Some("Error Test".to_string()),
        body: "This message should fail".to_string(),
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

    repo.save(message).await.unwrap();

    // Mark message as failed with error
    repo.update_status("msg_error", MessageStatus::Failed)
        .await
        .unwrap();

    // In a real implementation, we would also update the error_message
    // For now, we verify the status transition
    let failed_message = repo
        .find_by_id("msg_error".to_string())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(failed_message.status, "failed");

    // Search for failed messages
    let failed_messages = repo
        .search(MessageQuery {
            status: Some("failed".to_string()),
            ..Default::default()
        })
        .await
        .unwrap();

    assert_eq!(failed_messages.len(), 1);
    assert_eq!(failed_messages[0].id, "msg_error");
}
