use crate::db::Database;
use crate::domains::notifications::domain::models::notification::Notification;
use crate::domains::notifications::infrastructure::notification_in_app_repository::NotificationRepository;
use crate::shared::repositories::base::Repository;
use crate::shared::repositories::cache::Cache;
use std::sync::Arc;

/// Helper function to create notifications from domain events
///
/// This module provides utilities for creating in-app notifications
/// in response to domain events (tasks, interventions, quotes, etc.).
pub struct NotificationHelper;

impl NotificationHelper {
    /// Create a notification for a task assignment
    pub async fn create_task_assigned(
        db: &Arc<Database>,
        cache: &Arc<Cache>,
        user_id: &str,
        task_id: &str,
        task_title: &str,
    ) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        let notification = Notification {
            id: uuid::Uuid::new_v4().to_string(),
            created_at: chrono::Utc::now(),
            r#type: "TaskAssignment".to_string(),
            title: "Nouvelle tâche assignée".to_string(),
            message: format!("Vous avez été assigné à la tâche: {}", task_title),
            entity_type: "task".to_string(),
            entity_id: task_id.to_string(),
            entity_url: format!("/tasks/{}", task_id),
            read: false,
            user_id: user_id.to_string(),
        };

        repo.save(notification)
            .await
            .map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }

    /// Create a notification for a task update
    pub async fn create_task_updated(
        db: &Arc<Database>,
        cache: &Arc<Cache>,
        user_id: &str,
        task_id: &str,
        task_title: &str,
        status: &str,
    ) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        let notification = Notification {
            id: uuid::Uuid::new_v4().to_string(),
            created_at: chrono::Utc::now(),
            r#type: "TaskUpdate".to_string(),
            title: "Mise à jour de tâche".to_string(),
            message: format!("La tâche '{}' a été mise à jour: {}", task_title, status),
            entity_type: "task".to_string(),
            entity_id: task_id.to_string(),
            entity_url: format!("/tasks/{}", task_id),
            read: false,
            user_id: user_id.to_string(),
        };

        repo.save(notification)
            .await
            .map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }

    /// Create a notification for an intervention created
    pub async fn create_intervention_created(
        db: &Arc<Database>,
        cache: &Arc<Cache>,
        user_id: &str,
        intervention_id: &str,
        task_id: &str,
    ) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        let notification = Notification {
            id: uuid::Uuid::new_v4().to_string(),
            created_at: chrono::Utc::now(),
            r#type: "InterventionCreated".to_string(),
            title: "Nouvelle intervention".to_string(),
            message: format!("Une intervention a été créée pour la tâche {}", task_id),
            entity_type: "intervention".to_string(),
            entity_id: intervention_id.to_string(),
            entity_url: format!("/interventions/{}", intervention_id),
            read: false,
            user_id: user_id.to_string(),
        };

        repo.save(notification)
            .await
            .map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }

    /// Create a notification for a quote created
    pub async fn create_quote_created(
        db: &Arc<Database>,
        cache: &Arc<Cache>,
        user_id: &str,
        quote_id: &str,
        client_name: &str,
    ) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        let notification = Notification {
            id: uuid::Uuid::new_v4().to_string(),
            created_at: chrono::Utc::now(),
            r#type: "QuoteCreated".to_string(),
            title: "Nouveau devis créé".to_string(),
            message: format!(
                "Un nouveau devis a été créé pour le client: {}",
                client_name
            ),
            entity_type: "quote".to_string(),
            entity_id: quote_id.to_string(),
            entity_url: format!("/quotes/{}", quote_id),
            read: false,
            user_id: user_id.to_string(),
        };

        repo.save(notification)
            .await
            .map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }

    /// Create a notification for a quote approved
    pub async fn create_quote_approved(
        db: &Arc<Database>,
        cache: &Arc<Cache>,
        user_id: &str,
        quote_id: &str,
        client_name: &str,
    ) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        let notification = Notification {
            id: uuid::Uuid::new_v4().to_string(),
            created_at: chrono::Utc::now(),
            r#type: "QuoteApproved".to_string(),
            title: "Devis approuvé".to_string(),
            message: format!("Le devis pour {} a été approuvé", client_name),
            entity_type: "quote".to_string(),
            entity_id: quote_id.to_string(),
            entity_url: format!("/quotes/{}", quote_id),
            read: false,
            user_id: user_id.to_string(),
        };

        repo.save(notification)
            .await
            .map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }

    /// Create a notification for a client created
    pub async fn create_client_created(
        db: &Arc<Database>,
        cache: &Arc<Cache>,
        user_id: &str,
        client_id: &str,
        client_name: &str,
    ) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        let notification = Notification {
            id: uuid::Uuid::new_v4().to_string(),
            created_at: chrono::Utc::now(),
            r#type: "ClientCreated".to_string(),
            title: "Nouveau client ajouté".to_string(),
            message: format!("Un nouveau client a été ajouté: {}", client_name),
            entity_type: "client".to_string(),
            entity_id: client_id.to_string(),
            entity_url: format!("/clients/{}", client_id),
            read: false,
            user_id: user_id.to_string(),
        };

        repo.save(notification)
            .await
            .map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }

    /// Create a system alert notification
    pub async fn create_system_alert(
        db: &Arc<Database>,
        cache: &Arc<Cache>,
        user_id: &str,
        title: &str,
        message: &str,
    ) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        let notification = Notification {
            id: uuid::Uuid::new_v4().to_string(),
            created_at: chrono::Utc::now(),
            r#type: "SystemAlert".to_string(),
            title: title.to_string(),
            message: message.to_string(),
            entity_type: "system".to_string(),
            entity_id: "system".to_string(),
            entity_url: "/".to_string(),
            read: false,
            user_id: user_id.to_string(),
        };

        repo.save(notification)
            .await
            .map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }
}
