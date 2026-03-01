//! Integration tests for notification system
//!
//! Tests the full flow of creating, retrieving, and managing notifications.

use chrono::Utc;
use rpma_ppf_intervention::domains::notifications::domain::models::notification::Notification;
use rpma_ppf_intervention::domains::notifications::infrastructure::notification_in_app_repository::NotificationRepository;
use rpma_ppf_intervention::shared::repositories::cache::Cache;

#[tokio::test]
async fn test_create_and_retrieve_notification() {
    let db = crate::test_utils::TestDatabase::new().expect("Failed to create test DB");
    let cache = Cache::new(100);
    let repo = NotificationRepository::new(db.db(), cache);

    let user_id = "test_user_1";

    // Create a notification
    let notification = Notification {
        id: uuid::Uuid::new_v4().to_string(),
        created_at: Utc::now(),
        r#type: "TaskAssignment".to_string(),
        title: "Test Task".to_string(),
        message: "You have been assigned a new task".to_string(),
        entity_type: "task".to_string(),
        entity_id: "task_123".to_string(),
        entity_url: "/tasks/task_123".to_string(),
        read: false,
        user_id: user_id.to_string(),
    };

    repo.save(notification.clone())
        .await
        .expect("Failed to save notification");

    // Retrieve notifications for user
    let retrieved = repo
        .find_by_user(user_id, 10)
        .await
        .expect("Failed to retrieve");

    assert_eq!(retrieved.len(), 1);
    assert_eq!(retrieved[0].id, notification.id);
    assert_eq!(retrieved[0].title, notification.title);
    assert!(!retrieved[0].read);
}

#[tokio::test]
async fn test_mark_notification_as_read() {
    let db = crate::test_utils::TestDatabase::new().expect("Failed to create test DB");
    let cache = Cache::new(100);
    let repo = NotificationRepository::new(db.db(), cache);

    let user_id = "test_user_2";
    let notification_id = uuid::Uuid::new_v4().to_string();

    // Create a notification
    let notification = Notification {
        id: notification_id.clone(),
        created_at: Utc::now(),
        r#type: "TaskUpdate".to_string(),
        title: "Test Update".to_string(),
        message: "Task updated".to_string(),
        entity_type: "task".to_string(),
        entity_id: "task_456".to_string(),
        entity_url: "/tasks/task_456".to_string(),
        read: false,
        user_id: user_id.to_string(),
    };

    repo.save(notification)
        .await
        .expect("Failed to save notification");

    // Verify it's unread
    let retrieved = repo
        .find_by_user(user_id, 10)
        .await
        .expect("Failed to retrieve");
    assert_eq!(retrieved[0].read, false);

    // Mark as read
    repo.mark_read(&notification_id)
        .await
        .expect("Failed to mark as read");

    // Verify it's now read
    let retrieved = repo
        .find_by_user(user_id, 10)
        .await
        .expect("Failed to retrieve");
    assert_eq!(retrieved[0].read, true);
}

#[tokio::test]
async fn test_count_unread_notifications() {
    let db = crate::test_utils::TestDatabase::new().expect("Failed to create test DB");
    let cache = Cache::new(100);
    let repo = NotificationRepository::new(db.db(), cache);

    let user_id = "test_user_3";

    // Create multiple notifications, some read, some unread
    for i in 0..5 {
        let notification = Notification {
            id: uuid::Uuid::new_v4().to_string(),
            created_at: Utc::now(),
            r#type: "TaskAssignment".to_string(),
            title: format!("Task {}", i),
            message: format!("Task message {}", i),
            entity_type: "task".to_string(),
            entity_id: format!("task_{}", i),
            entity_url: format!("/tasks/task_{}", i),
            read: i % 2 == 0, // Every second is read
            user_id: user_id.to_string(),
        };

        repo.save(notification)
            .await
            .expect("Failed to save notification");
    }

    // Count unread (should be 3 - tasks 1, 3, 5)
    let count = repo
        .count_unread(user_id)
        .await
        .expect("Failed to count unread");
    assert_eq!(count, 3);
}

#[tokio::test]
async fn test_mark_all_as_read() {
    let db = crate::test_utils::TestDatabase::new().expect("Failed to create test DB");
    let cache = Cache::new(100);
    let repo = NotificationRepository::new(db.db(), cache);

    let user_id = "test_user_4";

    // Create multiple unread notifications
    for i in 0..3 {
        let notification = Notification {
            id: uuid::Uuid::new_v4().to_string(),
            created_at: Utc::now(),
            r#type: "TaskAssignment".to_string(),
            title: format!("Task {}", i),
            message: format!("Task message {}", i),
            entity_type: "task".to_string(),
            entity_id: format!("task_{}", i),
            entity_url: format!("/tasks/task_{}", i),
            read: false,
            user_id: user_id.to_string(),
        };

        repo.save(notification)
            .await
            .expect("Failed to save notification");
    }

    // Verify all are unread
    let retrieved = repo
        .find_by_user(user_id, 10)
        .await
        .expect("Failed to retrieve");
    assert_eq!(retrieved.len(), 3);
    assert!(retrieved.iter().all(|n| !n.read));

    // Mark all as read
    repo.mark_all_read(user_id)
        .await
        .expect("Failed to mark all as read");

    // Verify all are now read
    let retrieved = repo
        .find_by_user(user_id, 10)
        .await
        .expect("Failed to retrieve");
    assert!(retrieved.iter().all(|n| n.read));
}

#[tokio::test]
async fn test_delete_notification() {
    let db = crate::test_utils::TestDatabase::new().expect("Failed to create test DB");
    let cache = Cache::new(100);
    let repo = NotificationRepository::new(db.db(), cache);

    let user_id = "test_user_5";
    let notification_id = uuid::Uuid::new_v4().to_string();

    // Create a notification
    let notification = Notification {
        id: notification_id.clone(),
        created_at: Utc::now(),
        r#type: "TaskAssignment".to_string(),
        title: "Test Delete".to_string(),
        message: "Task to delete".to_string(),
        entity_type: "task".to_string(),
        entity_id: "task_999".to_string(),
        entity_url: "/tasks/task_999".to_string(),
        read: false,
        user_id: user_id.to_string(),
    };

    repo.save(notification)
        .await
        .expect("Failed to save notification");

    // Verify it exists
    let retrieved = repo
        .find_by_user(user_id, 10)
        .await
        .expect("Failed to retrieve");
    assert_eq!(retrieved.len(), 1);

    // Delete it
    let deleted = repo
        .delete(&notification_id)
        .await
        .expect("Failed to delete");
    assert!(deleted);

    // Verify it's gone
    let retrieved = repo
        .find_by_user(user_id, 10)
        .await
        .expect("Failed to retrieve");
    assert_eq!(retrieved.len(), 0);
}

#[tokio::test]
async fn test_notifications_ordered_by_created_at() {
    let db = crate::test_utils::TestDatabase::new().expect("Failed to create test DB");
    let cache = Cache::new(100);
    let repo = NotificationRepository::new(db.db(), cache);

    let user_id = "test_user_6";
    let mut ids = Vec::new();

    // Create notifications with different timestamps
    for i in 0..5 {
        let notification = Notification {
            id: uuid::Uuid::new_v4().to_string(),
            created_at: Utc::now() - chrono::Duration::seconds(3600 * i as i64), // i hours ago
            r#type: "TaskAssignment".to_string(),
            title: format!("Task {}", i),
            message: format!("Task message {}", i),
            entity_type: "task".to_string(),
            entity_id: format!("task_{}", i),
            entity_url: format!("/tasks/task_{}", i),
            read: false,
            user_id: user_id.to_string(),
        };

        let id = notification.id.clone();
        ids.push(id);
        repo.save(notification)
            .await
            .expect("Failed to save notification");
        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
    }

    // Retrieve and verify order (most recent first)
    let retrieved = repo
        .find_by_user(user_id, 10)
        .await
        .expect("Failed to retrieve");
    assert_eq!(retrieved.len(), 5);

    // First in list should be most recently created
    assert_eq!(retrieved[0].id, ids[4]);
    assert_eq!(retrieved[1].id, ids[3]);
    assert_eq!(retrieved[2].id, ids[2]);
    assert_eq!(retrieved[3].id, ids[1]);
    assert_eq!(retrieved[4].id, ids[0]);
}
