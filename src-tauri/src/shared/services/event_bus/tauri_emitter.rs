use async_trait::async_trait;
use tauri::Emitter;

use crate::shared::services::domain_event::DomainEvent;

use super::EventHandler;

/// Tauri event emitter that bridges domain events to the frontend via Tauri's event system.
///
/// Subscribes to key domain events and re-emits them as Tauri events so that
/// frontend listeners can invalidate TanStack Query caches without polling.
pub struct TauriEmitter {
    app_handle: tauri::AppHandle,
}

impl TauriEmitter {
    /// Create a new TauriEmitter backed by the given AppHandle.
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        Self { app_handle }
    }

    fn emit_task_status_changed(
        &self,
        task_id: &str,
        old_status: &str,
        new_status: &str,
    ) -> Result<(), String> {
        self.app_handle
            .emit(
                "task:status_changed",
                serde_json::json!({
                    "task_id": task_id,
                    "old_status": old_status,
                    "new_status": new_status,
                }),
            )
            .map_err(|e| e.to_string())
    }

    fn emit_intervention_started(
        &self,
        intervention_id: &str,
        task_id: &str,
    ) -> Result<(), String> {
        self.app_handle
            .emit(
                "intervention:started",
                serde_json::json!({
                    "intervention_id": intervention_id,
                    "task_id": task_id,
                }),
            )
            .map_err(|e| e.to_string())
    }

    fn emit_notification_received(
        &self,
        notification_id: &str,
        user_id: &str,
        message: &str,
    ) -> Result<(), String> {
        self.app_handle
            .emit(
                "notification:received",
                serde_json::json!({
                    "notification_id": notification_id,
                    "user_id": user_id,
                    "message": message,
                }),
            )
            .map_err(|e| e.to_string())
    }
}

#[async_trait]
impl EventHandler for TauriEmitter {
    async fn handle(&self, event: &DomainEvent) -> Result<(), String> {
        match event {
            DomainEvent::TaskStatusChanged {
                task_id,
                old_status,
                new_status,
                ..
            } => self.emit_task_status_changed(task_id, old_status, new_status)?,
            DomainEvent::InterventionStarted {
                intervention_id,
                task_id,
                ..
            } => self.emit_intervention_started(intervention_id, task_id)?,
            DomainEvent::NotificationReceived {
                notification_id,
                user_id,
                message,
                ..
            } => self.emit_notification_received(notification_id, user_id, message)?,
            // TODO: ADD_MORE_EVENTS - register additional domain-to-Tauri event mappings here
            _ => {}
        }
        Ok(())
    }

    fn interested_events(&self) -> Vec<&'static str> {
        vec![
            DomainEvent::TASK_STATUS_CHANGED,
            DomainEvent::INTERVENTION_STARTED,
            DomainEvent::NOTIFICATION_RECEIVED,
            // TODO: ADD_MORE_EVENTS - add event type names here when extending handle()
        ]
    }
}
