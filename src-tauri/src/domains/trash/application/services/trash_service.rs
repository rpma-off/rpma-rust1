use crate::db::Database;
use crate::domains::trash::domain::models::trash::{DeletedItem, EntityType};
use crate::domains::trash::infrastructure::trash_repository::TrashRepository;
use crate::shared::context::RequestContext;
use crate::shared::contracts::auth::UserRole;
use crate::shared::error::AppError;
use crate::shared::services::domain_event::DomainEvent;
use crate::shared::event_bus::publish_event;
use chrono::Utc;
use std::sync::Arc;

pub struct TrashService {
    repo: Arc<TrashRepository>,
}

impl TrashService {
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            repo: Arc::new(TrashRepository::new(db)),
        }
    }

    pub async fn list_deleted(
        &self,
        entity_type: EntityType,
        limit: i64,
        offset: i64,
        _ctx: &RequestContext,
    ) -> Result<Vec<DeletedItem>, AppError> {
        // Access is checked at IPC level
        self.repo.list_deleted(&entity_type, limit, offset)
    }

    pub async fn restore(
        &self,
        entity_type: EntityType,
        id: String,
        ctx: &RequestContext,
    ) -> Result<(), AppError> {
        if !matches!(ctx.auth.role, UserRole::Admin | UserRole::Supervisor) {
            return Err(AppError::Authorization(
                "Insufficient permissions to restore items".to_string(),
            ));
        }

        self.repo.restore(&entity_type, &id)?;

        let event = DomainEvent::EntityRestored {
            id: uuid::Uuid::new_v4().to_string(),
            entity_id: id,
            entity_type: format!("{:?}", entity_type),
            restored_by: ctx.auth.user_id.clone(),
            timestamp: Utc::now(),
            metadata: None,
        };
        
        publish_event(event);

        Ok(())
    }

    pub async fn hard_delete(
        &self,
        entity_type: EntityType,
        id: String,
        ctx: &RequestContext,
    ) -> Result<(), AppError> {
        if ctx.auth.role != UserRole::Admin {
            return Err(AppError::Authorization(
                "Insufficient permissions to permanently delete items".to_string(),
            ));
        }

        self.repo.hard_delete(&entity_type, &id)?;
        
        let event = DomainEvent::EntityHardDeleted {
            id: uuid::Uuid::new_v4().to_string(),
            entity_id: id,
            entity_type: format!("{:?}", entity_type),
            deleted_by: ctx.auth.user_id.clone(),
            timestamp: Utc::now(),
            metadata: None,
        };
        
        publish_event(event);

        Ok(())
    }

    pub async fn empty_trash(
        &self,
        entity_type: Option<EntityType>,
        _ctx: &RequestContext,
    ) -> Result<u64, AppError> {
        if _ctx.auth.role != UserRole::Admin {
            return Err(AppError::Authorization(
                "Insufficient permissions to empty trash".to_string(),
            ));
        }

        self.repo.empty_trash(entity_type)
    }
}
