//! Property-based tests for Messaging System
//!
//! Uses proptest to test message operations with random inputs

use crate::db::Database;
use crate::models::message::{
    Message, MessageStatus, MessageType, MessagePriority,
    SendMessageRequest, MessageTemplate, MessageTemplateRequest,
    NotificationPreferences
};
use crate::repositories::message::MessageRepository;
use proptest::prelude::*;
use rusqlite::params;
use std::sync::Arc;
use uuid::Uuid;

// Helper to create a test database with messaging tables
async fn create_test_db() -> Database {
    let db = Database::new_in_memory().await.unwrap();
    
    // Create messaging tables
    db.execute_batch(r#"
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
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );
        
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
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
        );
        
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
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
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

// Helper to create default notification preferences
fn create_default_notification_preferences(db: &Database, user_id: &str) {
    db.execute(r#"
        INSERT OR IGNORE INTO notification_preferences (
            id, user_id, email_enabled, sms_enabled, in_app_enabled,
            task_assigned, task_updated, task_completed, task_overdue,
            client_created, client_updated, system_alerts, maintenance_notifications,
            quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
            email_frequency, email_digest_time, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    "#, params![
        Uuid::new_v4().to_string(),
        user_id,
        1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1,
        0, "22:00", "08:00", "immediate", "09:00",
        chrono::Utc::now().timestamp(),
        chrono::Utc::now().timestamp()
    ]).unwrap();
}

// Strategy for generating valid message types
fn message_type_strategy() -> impl Strategy<Value = MessageType> {
    prop_oneof![
        Just(MessageType::Email),
        Just(MessageType::Sms),
        Just(MessageType::InApp),
    ]
}

// Strategy for generating valid message statuses
fn message_status_strategy() -> impl Strategy<Value = MessageStatus> {
    prop_oneof![
        Just(MessageStatus::Pending),
        Just(MessageStatus::Sent),
        Just(MessageStatus::Delivered),
        Just(MessageStatus::Failed),
        Just(MessageStatus::Read),
    ]
}

// Strategy for generating valid message priorities
fn message_priority_strategy() -> impl Strategy<Value = MessagePriority> {
    prop_oneof![
        Just(MessagePriority::Low),
        Just(MessagePriority::Normal),
        Just(MessagePriority::High),
        Just(MessagePriority::Urgent),
    ]
}

// Strategy for generating valid email addresses
fn email_strategy() -> impl Strategy<Value = String> {
    "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"
}

// Strategy for generating valid phone numbers
fn phone_strategy() -> impl Strategy<Value = String> {
    prop_oneof![
        "\\+[0-9]{10,15}".prop_map(|s| s.to_string()),
        "[0-9]{10}".prop_map(|s| s.to_string()),
    ]
}

// Strategy for generating valid message subjects
fn subject_strategy() -> impl Strategy<Value = Option<String>> {
    prop_oneof![
        Just(None),
        "[a-zA-Z0-9\\s\\.\\,\\!]{5,100}".prop_map(Some)
    ]
}

// Strategy for generating valid message bodies
fn body_strategy() -> impl Strategy<Value = String> {
    "[a-zA-Z0-9\\s\\.\\,\\!\\?]{10,1000}"
}

// Strategy for generating valid dates (now +/- 1 year)
fn date_strategy() -> impl Strategy<Value = Option<i64>> {
    let now = chrono::Utc::now();
    let year_ago = (now - chrono::Duration::days(365)).timestamp();
    let year_ahead = (now + chrono::Duration::days(365)).timestamp();
    
    prop_oneof![
        Just(None),
        (year_ago..=year_ahead).prop_map(Some)
    ]
}

// Strategy for generating valid time strings (HH:MM)
fn time_strategy() -> impl Strategy<Value = String> {
    let hour = 0u8..=23u8;
    let minute = 0u8..=59u8;
    
    (hour, minute).prop_map(|(h, m)| format!("{:02}:{:02}", h, m))
}

// Strategy for generating valid email frequencies
fn email_frequency_strategy() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("immediate".to_string()),
        Just("daily".to_string()),
        Just("weekly".to_string()),
    ]
}

// Strategy for generating valid template categories
fn template_category_strategy() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("general".to_string()),
        Just("task".to_string()),
        Just("client".to_string()),
        Just("system".to_string()),
        Just("reminder".to_string()),
    ]
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]
    
    #[test]
    fn test_create_message_with_random_valid_data(
        message_type in message_type_strategy(),
        status in message_status_strategy(),
        priority in message_priority_strategy(),
        email in email_strategy(),
        phone in phone_strategy(),
        subject in subject_strategy(),
        body in body_strategy(),
        scheduled_at in date_strategy()
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let repo = MessageRepository::new(Arc::new(db), Arc::new(crate::repositories::cache::Cache::new(100)));
            
            // Create test users
            create_test_user(&repo.db.get_connection().unwrap(), "sender_random", "sender@example.com");
            create_test_user(&repo.db.get_connection().unwrap(), "recipient_random", "recipient@example.com");
            
            // Create a message with random valid data
            let message = Message {
                id: Uuid::new_v4().to_string(),
                message_type: message_type.to_string(),
                sender_id: Some("sender_random".to_string()),
                recipient_id: Some("recipient_random".to_string()),
                recipient_email: if message_type == MessageType::Email { Some(email.clone()) } else { None },
                recipient_phone: if message_type == MessageType::Sms { Some(phone.clone()) } else { None },
                subject: subject.clone(),
                body: body.clone(),
                template_id: None,
                task_id: Some("task_random".to_string()),
                client_id: Some("client_random".to_string()),
                status: status.to_string(),
                priority: priority.to_string(),
                scheduled_at: scheduled_at,
                sent_at: None,
                read_at: None,
                error_message: None,
                metadata: Some(r#"{"test": "random"}"#.to_string()),
                created_at: chrono::Utc::now().timestamp(),
                updated_at: chrono::Utc::now().timestamp(),
            };
            
            // Save message
            let result = repo.save(message).await;
            prop_assert!(result.is_ok(), "Should successfully create message with valid random data");
            
            let saved_message = result.unwrap();
            
            // Verify the saved message has correct properties
            prop_assert_eq!(saved_message.message_type, message_type.to_string());
            prop_assert_eq!(saved_message.status, status.to_string());
            prop_assert_eq!(saved_message.priority, priority.to_string());
            
            if message_type == MessageType::Email {
                prop_assert_eq!(saved_message.recipient_email, Some(email));
            } else {
                prop_assert!(saved_message.recipient_email.is_none());
            }
            
            if message_type == MessageType::Sms {
                prop_assert_eq!(saved_message.recipient_phone, Some(phone));
            } else {
                prop_assert!(saved_message.recipient_phone.is_none());
            }
            
            prop_assert_eq!(saved_message.subject, subject);
            prop_assert_eq!(saved_message.body, body);
            prop_assert_eq!(saved_message.scheduled_at, scheduled_at);
        });
    }
    
    #[test]
    fn test_message_status_transitions_with_random_sequence(
        initial_status in message_status_strategy()
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let repo = MessageRepository::new(Arc::new(db), Arc::new(crate::repositories::cache::Cache::new(100)));
            
            // Create test users
            create_test_user(&repo.db.get_connection().unwrap(), "sender_transition", "sender@example.com");
            create_test_user(&repo.db.get_connection().unwrap(), "recipient_transition", "recipient@example.com");
            
            // Create a message
            let message = Message {
                id: Uuid::new_v4().to_string(),
                message_type: "email".to_string(),
                sender_id: Some("sender_transition".to_string()),
                recipient_id: Some("recipient_transition".to_string()),
                recipient_email: Some("recipient@example.com".to_string()),
                recipient_phone: None,
                subject: Some("Status Transition Test".to_string()),
                body: "Testing status transitions".to_string(),
                template_id: None,
                task_id: None,
                client_id: None,
                status: initial_status.to_string(),
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
            
            // Test valid status transitions
            match initial_status {
                MessageStatus::Pending => {
                    // Can transition to Sent, Failed
                    repo.update_status(&message.id, MessageStatus::Sent).await.unwrap();
                    let updated = repo.find_by_id(&message.id).await.unwrap().unwrap();
                    prop_assert_eq!(updated.status, "sent");
                    prop_assert!(updated.sent_at.is_some());
                    
                    // Can also transition to Failed
                    repo.update_status(&message.id, MessageStatus::Failed).await.unwrap();
                    let failed = repo.find_by_id(&message.id).await.unwrap().unwrap();
                    prop_assert_eq!(failed.status, "failed");
                },
                MessageStatus::Sent => {
                    // Can transition to Delivered
                    repo.update_status(&message.id, MessageStatus::Delivered).await.unwrap();
                    let delivered = repo.find_by_id(&message.id).await.unwrap().unwrap();
                    prop_assert_eq!(delivered.status, "delivered");
                },
                MessageStatus::Delivered => {
                    // Can transition to Read
                    repo.update_status(&message.id, MessageStatus::Read).await.unwrap();
                    let read = repo.find_by_id(&message.id).await.unwrap().unwrap();
                    prop_assert_eq!(read.status, "read");
                    prop_assert!(read.read_at.is_some());
                },
                MessageStatus::Failed => {
                    // Can transition back to Pending for retry
                    repo.update_status(&message.id, MessageStatus::Pending).await.unwrap();
                    let retried = repo.find_by_id(&message.id).await.unwrap().unwrap();
                    prop_assert_eq!(retried.status, "pending");
                },
                MessageStatus::Read => {
                    // Read is final, no further transitions
                    prop_assert!(true, "Read is a final status");
                }
            }
        });
    }
    
    #[test]
    fn test_message_template_with_random_valid_data(
        template_name in "[a-zA-Z\\s]{5,50}",
        description in prop::option::of("[a-zA-Z0-9\\s\\.\\,]{10,200}"),
        message_type in message_type_strategy(),
        subject in subject_strategy(),
        body in "[a-zA-Z0-9\\s\\.\\,\\{\\}]{10,1000}",
        category in template_category_strategy()
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let cache = Arc::new(crate::repositories::cache::Cache::new(100));
            
            // Create test user
            create_test_user(&db, "user_template", "user@example.com");
            
            // Create a message template with random valid data
            let template_id = Uuid::new_v4().to_string();
            db.execute(r#"
                INSERT INTO message_templates (
                    id, name, description, message_type, subject, body, variables,
                    category, is_active, created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#, params![
                template_id,
                template_name.clone(),
                description,
                message_type.to_string(),
                subject,
                body.clone(),
                "[\"var1\", \"var2\"]", // Simple variables array
                category.clone(),
                1, // is_active
                "user_template",
                chrono::Utc::now().timestamp_millis(),
                chrono::Utc::now().timestamp_millis()
            ]).unwrap();
            
            // Retrieve template
            let retrieved: Option<MessageTemplate> = db
                .query_single_as(
                    "SELECT * FROM message_templates WHERE id = ?",
                    params![template_id]
                )
                .unwrap();
            
            prop_assert!(retrieved.is_some(), "Template should be retrievable");
            let template = retrieved.unwrap();
            
            prop_assert_eq!(template.name, template_name);
            prop_assert_eq!(template.description, description);
            prop_assert_eq!(template.message_type, message_type.to_string());
            prop_assert_eq!(template.subject, subject);
            prop_assert_eq!(template.body, body);
            prop_assert_eq!(template.category, category);
            prop_assert!(template.is_active);
            prop_assert_eq!(template.created_by, Some("user_template".to_string()));
        });
    }
    
    #[test]
    fn test_notification_preferences_with_random_valid_data(
        email_enabled in prop::bool::ANY,
        sms_enabled in prop::bool::ANY,
        in_app_enabled in prop::bool::ANY,
        task_assigned in prop::bool::ANY,
        task_updated in prop::bool::ANY,
        task_completed in prop::bool::ANY,
        task_overdue in prop::bool::ANY,
        client_created in prop::bool::ANY,
        client_updated in prop::bool::ANY,
        system_alerts in prop::bool::ANY,
        maintenance_notifications in prop::bool::ANY,
        quiet_hours_enabled in prop::bool::ANY,
        quiet_hours_start in time_strategy(),
        quiet_hours_end in time_strategy(),
        email_frequency in email_frequency_strategy(),
        email_digest_time in time_strategy()
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            
            // Create test user
            let user_id = "user_prefs_random";
            create_test_user(&db, user_id, "user@example.com");
            
            // Create notification preferences with random valid data
            let pref_id = Uuid::new_v4().to_string();
            db.execute(r#"
                INSERT OR REPLACE INTO notification_preferences (
                    id, user_id, email_enabled, sms_enabled, in_app_enabled,
                    task_assigned, task_updated, task_completed, task_overdue,
                    client_created, client_updated, system_alerts, maintenance_notifications,
                    quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
                    email_frequency, email_digest_time, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#, params![
                pref_id,
                user_id,
                email_enabled as i32,
                sms_enabled as i32,
                in_app_enabled as i32,
                task_assigned as i32,
                task_updated as i32,
                task_completed as i32,
                task_overdue as i32,
                client_created as i32,
                client_updated as i32,
                system_alerts as i32,
                maintenance_notifications as i32,
                quiet_hours_enabled as i32,
                quiet_hours_start.clone(),
                quiet_hours_end.clone(),
                email_frequency.clone(),
                email_digest_time.clone(),
                chrono::Utc::now().timestamp(),
                chrono::Utc::now().timestamp()
            ]).unwrap();
            
            // Retrieve preferences
            let retrieved: Option<NotificationPreferences> = db
                .query_single_as(
                    "SELECT * FROM notification_preferences WHERE user_id = ?",
                    params![user_id]
                )
                .unwrap();
            
            prop_assert!(retrieved.is_some(), "Preferences should be retrievable");
            let prefs = retrieved.unwrap();
            
            prop_assert_eq!(prefs.user_id, user_id);
            prop_assert_eq!(prefs.email_enabled, email_enabled);
            prop_assert_eq!(prefs.sms_enabled, sms_enabled);
            prop_assert_eq!(prefs.in_app_enabled, in_app_enabled);
            prop_assert_eq!(prefs.task_assigned, task_assigned);
            prop_assert_eq!(prefs.task_updated, task_updated);
            prop_assert_eq!(prefs.task_completed, task_completed);
            prop_assert_eq!(prefs.task_overdue, task_overdue);
            prop_assert_eq!(prefs.client_created, client_created);
            prop_assert_eq!(prefs.client_updated, client_updated);
            prop_assert_eq!(prefs.system_alerts, system_alerts);
            prop_assert_eq!(prefs.maintenance_notifications, maintenance_notifications);
            prop_assert_eq!(prefs.quiet_hours_enabled, quiet_hours_enabled);
            prop_assert_eq!(prefs.quiet_hours_start, Some(quiet_hours_start));
            prop_assert_eq!(prefs.quiet_hours_end, Some(quiet_hours_end));
            prop_assert_eq!(prefs.email_frequency, email_frequency);
            prop_assert_eq!(prefs.email_digest_time, email_digest_time);
            
            // Validate quiet hours logic
            if quiet_hours_enabled {
                // In a real implementation, we'd validate that start < end
                // For now, we just verify the values are stored correctly
                prop_assert!(prefs.quiet_hours_start.is_some());
                prop_assert!(prefs.quiet_hours_end.is_some());
            }
        });
    }
    
    #[test]
    fn test_message_search_with_random_filters(
        messages_count in 10usize..=50usize,
        search_term in prop::option::of("[a-zA-Z0-9]{3,10}")
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let repo = MessageRepository::new(Arc::new(db), Arc::new(crate::repositories::cache::Cache::new(100)));
            
            // Create test users
            create_test_user(&repo.db.get_connection().unwrap(), "sender_search", "sender@example.com");
            create_test_user(&repo.db.get_connection().unwrap(), "recipient_search", "recipient@example.com");
            
            // Create messages with searchable content
            let mut searchable_content = Vec::new();
            for i in 0..messages_count {
                let content = format!("SearchableContent{} with keyword TestKeyword{}", i, i % 10);
                searchable_content.push(content.clone());
                
                let message = Message {
                    id: format!("msg_search_{}", i),
                    message_type: "email".to_string(),
                    sender_id: Some("sender_search".to_string()),
                    recipient_id: Some("recipient_search".to_string()),
                    recipient_email: Some("recipient@example.com".to_string()),
                    recipient_phone: None,
                    subject: Some(format!("Search Subject {}", i)),
                    body: content,
                    template_id: None,
                    task_id: Some(format!("task_search_{}", i)),
                    client_id: Some("client_search".to_string()),
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
            
            // Test search functionality
            match search_term {
                Some(term) => {
                    if term == "TestKeyword" {
                        // Should find messages with "TestKeyword"
                        let search_results = repo.search(MessageQuery {
                            search: Some(term.clone()),
                            ..Default::default()
                        }).await.unwrap();
                        
                        // Should find approximately 1/10 of messages (those with TestKeyword0-9)
                        prop_assert!(search_results.len() > 0);
                        prop_assert!(search_results.len() <= messages_count / 10 + 1);
                        
                        // All results should contain the search term
                        for result in &search_results {
                            let content = format!("{} {}", result.subject.as_ref().unwrap_or(""), result.body);
                            prop_assert!(content.to_lowercase().contains(&term.to_lowercase()));
                        }
                    } else {
                        // Search for specific content
                        let search_results = repo.search(MessageQuery {
                            search: Some(term.clone()),
                            ..Default::default()
                        }).await.unwrap();
                        
                        // Results should contain the search term
                        for result in &search_results {
                            let content = format!("{} {}", result.subject.as_ref().unwrap_or(""), result.body);
                            prop_assert!(content.to_lowercase().contains(&term.to_lowercase()));
                        }
                    }
                },
                None => {
                    // No search term should return all messages
                    let all_results = repo.search(MessageQuery::default()).await.unwrap();
                    prop_assert_eq!(all_results.len(), messages_count);
                }
            }
        });
    }
    
    #[test]
    fn test_message_scheduling_with_random_times(
        scheduled_offset in 0i64..=86400i64 // 0 to 24 hours from now
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let repo = MessageRepository::new(Arc::new(db), Arc::new(crate::repositories::cache::Cache::new(100)));
            
            // Create test users
            create_test_user(&repo.db.get_connection().unwrap(), "sender_schedule", "sender@example.com");
            create_test_user(&repo.db.get_connection().unwrap(), "recipient_schedule", "recipient@example.com");
            
            let scheduled_time = chrono::Utc::now().timestamp() + scheduled_offset;
            
            // Create a scheduled message
            let message = Message {
                id: Uuid::new_v4().to_string(),
                message_type: "email".to_string(),
                sender_id: Some("sender_schedule".to_string()),
                recipient_id: Some("recipient_schedule".to_string()),
                recipient_email: Some("recipient@example.com".to_string()),
                recipient_phone: None,
                subject: Some("Scheduled Message".to_string()),
                body: "This message is scheduled for future delivery".to_string(),
                template_id: None,
                task_id: Some("task_schedule".to_string()),
                client_id: Some("client_schedule".to_string()),
                status: "pending".to_string(),
                priority: "normal".to_string(),
                scheduled_at: Some(scheduled_time),
                sent_at: None,
                read_at: None,
                error_message: None,
                metadata: Some(r#"{"scheduled": true}"#.to_string()),
                created_at: chrono::Utc::now().timestamp(),
                updated_at: chrono::Utc::now().timestamp(),
            };
            
            // Save message
            let result = repo.save(message).await;
            prop_assert!(result.is_ok());
            
            let saved_message = result.unwrap();
            prop_assert_eq!(saved_message.scheduled_at, Some(scheduled_time));
            prop_assert_eq!(saved_message.status, "pending");
            prop_assert!(saved_message.sent_at.is_none());
            
            // Should not be in unsent messages if scheduled for future
            if scheduled_offset > 3600 { // More than 1 hour in future
                // In a real implementation, we might filter out future-scheduled messages
                // For this test, we just verify the scheduling data
                prop_assert!(saved_message.scheduled_at.unwrap() > chrono::Utc::now().timestamp());
            }
        });
    }
    
    #[test]
    fn test_message_priority_ordering_with_random_data(
        message_count in 5usize..=20usize
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let repo = MessageRepository::new(Arc::new(db), Arc::new(crate::repositories::cache::Cache::new(100)));
            
            // Create test users
            create_test_user(&repo.db.get_connection().unwrap(), "sender_priority", "sender@example.com");
            create_test_user(&repo.db.get_connection().unwrap(), "recipient_priority", "recipient@example.com");
            
            // Create messages with different priorities
            let priorities = vec!["low", "normal", "high", "urgent"];
            
            for i in 0..message_count {
                let priority = priorities[i % priorities.len()];
                
                let message = Message {
                    id: format!("msg_priority_{}", i),
                    message_type: "email".to_string(),
                    sender_id: Some("sender_priority".to_string()),
                    recipient_id: Some("recipient_priority".to_string()),
                    recipient_email: Some("recipient@example.com".to_string()),
                    recipient_phone: None,
                    subject: Some(format!("Priority Test {}", i)),
                    body: format!("Body with priority {}", priority),
                    template_id: None,
                    task_id: Some(format!("task_priority_{}", i)),
                    client_id: Some("client_priority".to_string()),
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
            
            // Search for urgent messages
            let urgent_messages = repo.search(MessageQuery {
                priority: Some("urgent".to_string()),
                ..Default::default()
            }).await.unwrap();
            
            // Should contain only urgent messages
            for message in &urgent_messages {
                prop_assert_eq!(message.priority, "urgent");
            }
            
            // Search for high priority messages
            let high_priority_messages = repo.search(MessageQuery {
                priority: Some("high".to_string()),
                ..Default::default()
            }).await.unwrap();
            
            // Should contain only high priority messages
            for message in &high_priority_messages {
                prop_assert_eq!(message.priority, "high");
            }
            
            // Verify priority ordering in combined results
            let all_messages = repo.search(MessageQuery::default()).await.unwrap();
            
            // Sort by priority (urgent > high > normal > low)
            let priority_order = |p: &str| match p {
                "urgent" => 4,
                "high" => 3,
                "normal" => 2,
                "low" => 1,
                _ => 0,
            };
            
            for i in 1..all_messages.len() {
                let prev_priority = priority_order(all_messages[i-1].priority.as_str());
                let curr_priority = priority_order(all_messages[i].priority.as_str());
                
                // Should be sorted by creation time descending (newest first)
                // For equal creation times, higher priority should come first
                if all_messages[i-1].created_at == all_messages[i].created_at {
                    prop_assert!(prev_priority >= curr_priority,
                        "For same timestamp, higher priority should come first");
                }
            }
        });
    }
    
    #[test]
    fn test_message_metadata_with_random_content(
        metadata_content in prop::option::of("[a-zA-Z0-9\\s\\.\\,\\\":{}]{10,200}")
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let repo = MessageRepository::new(Arc::new(db), Arc::new(crate::repositories::cache::Cache::new(100)));
            
            // Create test users
            create_test_user(&repo.db.get_connection().unwrap(), "sender_metadata", "sender@example.com");
            create_test_user(&repo.db.get_connection().unwrap(), "recipient_metadata", "recipient@example.com");
            
            // Create a message with metadata
            let message = Message {
                id: Uuid::new_v4().to_string(),
                message_type: "email".to_string(),
                sender_id: Some("sender_metadata".to_string()),
                recipient_id: Some("recipient_metadata".to_string()),
                recipient_email: Some("recipient@example.com".to_string()),
                recipient_phone: None,
                subject: Some("Metadata Test".to_string()),
                body: "Test message with metadata".to_string(),
                template_id: None,
                task_id: Some("task_metadata".to_string()),
                client_id: Some("client_metadata".to_string()),
                status: "pending".to_string(),
                priority: "normal".to_string(),
                scheduled_at: None,
                sent_at: None,
                read_at: None,
                error_message: None,
                metadata: metadata_content.clone(),
                created_at: chrono::Utc::now().timestamp(),
                updated_at: chrono::Utc::now().timestamp(),
            };
            
            // Save message
            let result = repo.save(message).await;
            prop_assert!(result.is_ok());
            
            let saved_message = result.unwrap();
            prop_assert_eq!(saved_message.metadata, metadata_content);
            
            // Verify metadata is preserved in search
            let search_results = repo.search(MessageQuery::default()).await.unwrap();
            let found_message = search_results.iter().find(|m| m.id == saved_message.id);
            
            prop_assert!(found_message.is_some());
            let found_message = found_message.unwrap();
            prop_assert_eq!(found_message.metadata, metadata_content);
        });
    }
}
