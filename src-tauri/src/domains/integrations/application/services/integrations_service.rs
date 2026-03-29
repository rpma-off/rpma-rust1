use async_trait::async_trait;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use chrono::Utc;
use reqwest::Client;
use sha2::{Digest, Sha256};
use std::sync::Arc;
use uuid::Uuid;

use crate::db::Database;
use crate::domains::integrations::domain::models::integrations::{
    CreateIntegrationRequest, DeliveryStatus, IntegrationConfig, IntegrationKind,
    IntegrationStatus, TestIntegrationResponse, UpdateIntegrationRequest,
};
use crate::domains::integrations::infrastructure::integrations_repository::{
    DeliveryRecord, IntegrationsRepository, SqliteIntegrationsRepository,
};
use crate::shared::context::RequestContext;
use crate::shared::contracts::integration_sink::{
    IntegrationDispatchRequest, IntegrationEventSink,
};
use crate::shared::error::{AppError, AppResult};

pub struct IntegrationsService {
    repo: Arc<dyn IntegrationsRepository>,
    http_client: Client,
}

impl std::fmt::Debug for IntegrationsService {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("IntegrationsService")
            .field("repo", &"Arc<dyn IntegrationsRepository>")
            .finish()
    }
}

impl IntegrationsService {
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            repo: Arc::new(SqliteIntegrationsRepository::new(db)),
            http_client: Client::new(),
        }
    }

    pub async fn list(&self, _ctx: &RequestContext) -> AppResult<Vec<IntegrationConfig>> {
        self.repo.list().await
    }

    pub async fn get(&self, id: &str, _ctx: &RequestContext) -> AppResult<IntegrationConfig> {
        self.repo.get(id).await
    }

    pub async fn create(
        &self,
        _ctx: &RequestContext,
        request: CreateIntegrationRequest,
    ) -> AppResult<IntegrationConfig> {
        self.validate_endpoint(&request.endpoint_url)?;
        let now = Utc::now().timestamp_millis();
        let integration = IntegrationConfig {
            id: Uuid::new_v4().to_string(),
            name: request.name.trim().to_string(),
            description: request.description.map(|value| value.trim().to_string()),
            kind: IntegrationKind::Webhook,
            status: IntegrationStatus::Draft,
            endpoint_url: request.endpoint_url.trim().to_string(),
            headers: request.headers,
            subscribed_events: request.subscribed_events,
            has_secret: request
                .secret_token
                .as_ref()
                .is_some_and(|value| !value.is_empty()),
            last_tested_at: None,
            created_at: now,
            updated_at: now,
            deleted_at: None,
        };
        let encrypted_secret = request
            .secret_token
            .filter(|value| !value.is_empty())
            .map(|value| self.encrypt_secret(&value));
        self.repo.create(&integration, encrypted_secret).await?;
        Ok(integration)
    }

    pub async fn update(
        &self,
        _ctx: &RequestContext,
        id: &str,
        request: UpdateIntegrationRequest,
    ) -> AppResult<IntegrationConfig> {
        let mut integration = self.repo.get(id).await?;
        if let Some(name) = request.name {
            integration.name = name.trim().to_string();
        }
        if let Some(description) = request.description {
            integration.description = Some(description.trim().to_string());
        }
        if let Some(endpoint_url) = request.endpoint_url {
            self.validate_endpoint(&endpoint_url)?;
            integration.endpoint_url = endpoint_url.trim().to_string();
        }
        if let Some(headers) = request.headers {
            integration.headers = headers;
        }
        if let Some(subscribed_events) = request.subscribed_events {
            integration.subscribed_events = subscribed_events;
        }
        if let Some(status) = request.status {
            integration.status = status;
        }
        let encrypted_secret = request
            .secret_token
            .filter(|value| !value.is_empty())
            .map(|value| self.encrypt_secret(&value));
        integration.has_secret = integration.has_secret || encrypted_secret.is_some();
        integration.updated_at = Utc::now().timestamp_millis();
        self.repo.update(&integration, encrypted_secret).await?;
        Ok(integration)
    }

    pub async fn test_connection(
        &self,
        _ctx: &RequestContext,
        id: &str,
    ) -> AppResult<TestIntegrationResponse> {
        let integration = self.repo.get_with_secret(id).await?;
        let tested_at = Utc::now().timestamp_millis();
        let mut request = self.http_client.get(&integration.config.endpoint_url);
        for (key, value) in &integration.config.headers {
            request = request.header(key, value);
        }
        if let Some(secret) = integration
            .secret_token
            .as_deref()
            .and_then(|value| self.decrypt_secret(value))
        {
            request = request.bearer_auth(secret);
        }
        let result = request.send().await;
        let (success, message) = match result {
            Ok(response) if response.status().is_success() => (
                true,
                format!("Connection test succeeded with {}", response.status()),
            ),
            Ok(response) => (
                false,
                format!("Connection test failed with HTTP {}", response.status()),
            ),
            Err(error) => (false, format!("Connection test failed: {}", error)),
        };
        self.repo.update_last_tested_at(id, tested_at).await?;
        Ok(TestIntegrationResponse {
            success,
            message,
            tested_at,
        })
    }

    pub async fn retry_dead_letters(&self, _ctx: &RequestContext, id: &str) -> AppResult<usize> {
        self.repo.retry_dead_letters(id).await
    }

    pub async fn delete(&self, _ctx: &RequestContext, id: &str) -> AppResult<IntegrationConfig> {
        let mut integration = self.repo.get(id).await?;
        integration.status = IntegrationStatus::Disabled;
        integration.updated_at = Utc::now().timestamp_millis();
        integration.deleted_at = Some(integration.updated_at);
        self.repo.update(&integration, None).await?;
        Ok(integration)
    }

    fn validate_endpoint(&self, endpoint_url: &str) -> AppResult<()> {
        if endpoint_url.trim().is_empty() {
            return Err(AppError::Validation(
                "Integration endpoint_url is required".to_string(),
            ));
        }
        if !(endpoint_url.starts_with("http://") || endpoint_url.starts_with("https://")) {
            return Err(AppError::Validation(
                "Integration endpoint_url must start with http:// or https://".to_string(),
            ));
        }
        Ok(())
    }

    fn encrypt_secret(&self, secret: &str) -> String {
        let key = std::env::var("RPMA_DB_KEY").unwrap_or_else(|_| "rpma-dev-key".to_string());
        let digest = Sha256::digest(key.as_bytes());
        let encrypted: Vec<u8> = secret
            .as_bytes()
            .iter()
            .enumerate()
            .map(|(index, byte)| byte ^ digest[index % digest.len()])
            .collect();
        BASE64.encode(encrypted)
    }

    fn decrypt_secret(&self, cipher_text: &str) -> Option<String> {
        let key = std::env::var("RPMA_DB_KEY").unwrap_or_else(|_| "rpma-dev-key".to_string());
        let digest = Sha256::digest(key.as_bytes());
        let decoded = BASE64.decode(cipher_text).ok()?;
        let decrypted: Vec<u8> = decoded
            .iter()
            .enumerate()
            .map(|(index, byte)| byte ^ digest[index % digest.len()])
            .collect();
        String::from_utf8(decrypted).ok()
    }
}

#[async_trait]
impl IntegrationEventSink for IntegrationsService {
    async fn enqueue(&self, request: IntegrationDispatchRequest) -> Result<usize, AppError> {
        let integrations = self
            .repo
            .list_active_for_event(
                &request.event_name,
                request.requested_integration_ids.as_ref(),
            )
            .await?;
        let now = Utc::now().timestamp_millis();
        for integration in &integrations {
            self.repo
                .store_delivery(&DeliveryRecord {
                    id: Uuid::new_v4().to_string(),
                    integration_id: integration.id.clone(),
                    event_name: request.event_name.clone(),
                    payload: request.payload.clone(),
                    correlation_id: request.correlation_id.clone(),
                    status: DeliveryStatus::Pending,
                    attempt_count: 0,
                    last_error: None,
                    next_retry_at: Some(now),
                    created_at: now,
                    updated_at: now,
                })
                .await?;
        }
        Ok(integrations.len())
    }

    async fn process_pending(&self, limit: usize) -> Result<usize, AppError> {
        let due = self.repo.list_due_deliveries(limit).await?;
        let mut processed = 0usize;
        for delivery in due {
            let integration = self.repo.get_with_secret(&delivery.integration_id).await?;
            let mut request = self
                .http_client
                .post(&integration.config.endpoint_url)
                .json(&delivery.payload);
            for (key, value) in &integration.config.headers {
                request = request.header(key, value);
            }
            if let Some(secret) = integration
                .secret_token
                .as_deref()
                .and_then(|value| self.decrypt_secret(value))
            {
                request = request.bearer_auth(secret);
            }

            let now = Utc::now().timestamp_millis();
            let result = request.send().await;
            match result {
                Ok(response) if response.status().is_success() => {
                    self.repo
                        .mark_delivery_result(
                            &delivery.id,
                            DeliveryStatus::Delivered,
                            delivery.attempt_count + 1,
                            None,
                            None,
                            now,
                        )
                        .await?;
                }
                Ok(response) => {
                    let attempts = delivery.attempt_count + 1;
                    let status = if attempts >= 5 {
                        DeliveryStatus::DeadLetter
                    } else {
                        DeliveryStatus::Retrying
                    };
                    let next_retry_at = if status == DeliveryStatus::DeadLetter {
                        None
                    } else {
                        Some(now + attempts * 60_000)
                    };
                    self.repo
                        .mark_delivery_result(
                            &delivery.id,
                            status,
                            attempts,
                            Some(format!("HTTP {}", response.status())),
                            next_retry_at,
                            now,
                        )
                        .await?;
                }
                Err(error) => {
                    let attempts = delivery.attempt_count + 1;
                    let status = if attempts >= 5 {
                        DeliveryStatus::DeadLetter
                    } else {
                        DeliveryStatus::Retrying
                    };
                    let next_retry_at = if status == DeliveryStatus::DeadLetter {
                        None
                    } else {
                        Some(now + attempts * 60_000)
                    };
                    self.repo
                        .mark_delivery_result(
                            &delivery.id,
                            status,
                            attempts,
                            Some(error.to_string()),
                            next_retry_at,
                            now,
                        )
                        .await?;
                }
            }
            processed += 1;
        }
        Ok(processed)
    }
}
