use std::sync::Arc;

use crate::db::Database;
use crate::domains::notifications::models::Notification;
use crate::shared::repositories::base::Repository;
use crate::shared::repositories::cache::Cache;

use super::notification_repository::NotificationRepository;

pub struct NotificationHelper;

impl NotificationHelper {
    pub async fn create_task_assigned(db: &Arc<Database>, cache: &Arc<Cache>, user_id: &str, task_id: &str, task_title: &str) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        repo.save(Notification::new(user_id.to_string(), "TaskAssignment".to_string(), "Nouvelle tâche assignée".to_string(), format!("Vous avez été assigné à la tâche: {}", task_title), "task".to_string(), task_id.to_string(), format!("/tasks/{}", task_id))).await.map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }

    pub async fn create_task_updated(db: &Arc<Database>, cache: &Arc<Cache>, user_id: &str, task_id: &str, task_title: &str, status: &str) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        repo.save(Notification::new(user_id.to_string(), "TaskUpdate".to_string(), "Mise à jour de tâche".to_string(), format!("La tâche '{}' a été mise à jour: {}", task_title, status), "task".to_string(), task_id.to_string(), format!("/tasks/{}", task_id))).await.map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }

    pub async fn create_intervention_created(db: &Arc<Database>, cache: &Arc<Cache>, user_id: &str, intervention_id: &str, task_id: &str) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        repo.save(Notification::new(user_id.to_string(), "InterventionCreated".to_string(), "Nouvelle intervention".to_string(), format!("Une intervention a été créée pour la tâche {}", task_id), "intervention".to_string(), intervention_id.to_string(), format!("/interventions/{}", intervention_id))).await.map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }

    pub async fn create_quote_created(db: &Arc<Database>, cache: &Arc<Cache>, user_id: &str, quote_id: &str, client_name: &str) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        repo.save(Notification::new(user_id.to_string(), "QuoteCreated".to_string(), "Nouveau devis créé".to_string(), format!("Un nouveau devis a été créé pour le client: {}", client_name), "quote".to_string(), quote_id.to_string(), format!("/quotes/{}", quote_id))).await.map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }

    pub async fn create_quote_approved(db: &Arc<Database>, cache: &Arc<Cache>, user_id: &str, quote_id: &str, client_name: &str) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        repo.save(Notification::new(user_id.to_string(), "QuoteApproved".to_string(), "Devis approuvé".to_string(), format!("Le devis pour {} a été approuvé", client_name), "quote".to_string(), quote_id.to_string(), format!("/quotes/{}", quote_id))).await.map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }

    pub async fn create_client_created(db: &Arc<Database>, cache: &Arc<Cache>, user_id: &str, client_id: &str, client_name: &str) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        repo.save(Notification::new(user_id.to_string(), "ClientCreated".to_string(), "Nouveau client ajouté".to_string(), format!("Un nouveau client a été ajouté: {}", client_name), "client".to_string(), client_id.to_string(), format!("/clients/{}", client_id))).await.map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }

    pub async fn create_system_alert(db: &Arc<Database>, cache: &Arc<Cache>, user_id: &str, title: &str, message: &str) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        repo.save(Notification::new(user_id.to_string(), "SystemAlert".to_string(), title.to_string(), message.to_string(), "system".to_string(), "system".to_string(), "/".to_string())).await.map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }
}
