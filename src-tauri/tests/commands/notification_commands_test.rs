//! Tests for notification command handlers.

use rpma_ppf_intervention::domains::notifications::ipc::notification_in_app::{
    create_notification, delete_notification, get_notifications, mark_all_notifications_read,
    mark_notification_read,
};

#[test]
fn test_notification_command_symbols_exist() {
    let _ = get_notifications;
    let _ = mark_notification_read;
    let _ = mark_all_notifications_read;
    let _ = delete_notification;
    let _ = create_notification;
}

#[test]
fn test_create_notification_request_structure() {
    use rpma_ppf_intervention::domains::notifications::ipc::notification_in_app::CreateNotificationRequest;
    let _request_type = std::any::type_name::<CreateNotificationRequest>();
}
