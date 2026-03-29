use super::DomainEvent;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EventMetadata {
    pub correlation_id: String,
    pub user_id: Option<String>,
    pub source: String,
    pub ip_address: Option<String>,
    pub custom: Option<serde_json::Value>,
}

impl EventMetadata {
    pub fn new(source: String) -> Self {
        Self {
            correlation_id: uuid::Uuid::new_v4().to_string(),
            user_id: None,
            source,
            ip_address: None,
            custom: None,
        }
    }

    pub fn with_user(source: String, user_id: String) -> Self {
        Self {
            correlation_id: uuid::Uuid::new_v4().to_string(),
            user_id: Some(user_id),
            source,
            ip_address: None,
            custom: None,
        }
    }

    pub fn with_correlation_id(mut self, correlation_id: String) -> Self {
        self.correlation_id = correlation_id;
        self
    }

    pub fn with_ip_address(mut self, ip_address: String) -> Self {
        self.ip_address = Some(ip_address);
        self
    }

    pub fn with_custom(mut self, custom: serde_json::Value) -> Self {
        self.custom = Some(custom);
        self
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EventEnvelope {
    pub event: DomainEvent,
    pub metadata: EventMetadata,
    pub version: i32,
}

impl EventEnvelope {
    pub fn new(event: DomainEvent, metadata: EventMetadata) -> Self {
        Self {
            event,
            metadata,
            version: 1,
        }
    }

    pub fn with_event(event: DomainEvent, source: String) -> Self {
        Self::new(event, EventMetadata::new(source))
    }

    pub fn with_user(event: DomainEvent, source: String, user_id: String) -> Self {
        Self::new(event, EventMetadata::with_user(source, user_id))
    }
}
