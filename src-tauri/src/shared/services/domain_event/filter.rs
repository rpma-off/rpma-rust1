use chrono::{DateTime, Utc};

#[derive(Debug, Clone)]
pub struct EventFilter {
    pub event_types: Option<Vec<String>>,
    pub aggregate_id: Option<String>,
    pub user_id: Option<String>,
    pub from_timestamp: Option<DateTime<Utc>>,
    pub to_timestamp: Option<DateTime<Utc>>,
    pub limit: Option<usize>,
}

impl EventFilter {
    pub fn new() -> Self {
        Self {
            event_types: None,
            aggregate_id: None,
            user_id: None,
            from_timestamp: None,
            to_timestamp: None,
            limit: None,
        }
    }

    pub fn with_event_type(mut self, event_type: String) -> Self {
        self.event_types = Some(vec![event_type]);
        self
    }

    pub fn with_event_types(mut self, event_types: Vec<String>) -> Self {
        self.event_types = Some(event_types);
        self
    }

    pub fn with_aggregate_id(mut self, aggregate_id: String) -> Self {
        self.aggregate_id = Some(aggregate_id);
        self
    }

    pub fn with_user_id(mut self, user_id: String) -> Self {
        self.user_id = Some(user_id);
        self
    }

    pub fn with_time_range(mut self, from: DateTime<Utc>, to: DateTime<Utc>) -> Self {
        self.from_timestamp = Some(from);
        self.to_timestamp = Some(to);
        self
    }

    pub fn with_limit(mut self, limit: usize) -> Self {
        self.limit = Some(limit);
        self
    }
}

impl Default for EventFilter {
    fn default() -> Self {
        Self::new()
    }
}
