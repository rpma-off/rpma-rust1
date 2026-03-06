//! Task creation from an accepted quote.
//!
//! Extracted from `quote_service.rs` so that the cross-domain concern
//! (quote → task) lives in its own focused module.

use crate::domains::quotes::domain::models::quote::Quote;
use chrono::Utc;
use uuid::Uuid;

use super::quote_service::QuoteService;

impl QuoteService {
    /// Create a task from a quote, delegating to the repository for SQL.
    pub(super) fn create_task_from_quote(&self, quote: &Quote) -> Result<String, String> {
        use crate::domains::quotes::infrastructure::quote_repository::CreateTaskFromQuoteParams;

        let task_id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp_millis();
        let task_number = format!("TASK-Q-{:05}", now % 100000);
        let title = format!("Tâche issue du devis {}", quote.quote_number);
        let scheduled_date = Utc::now().format("%Y-%m-%d").to_string();

        let params = CreateTaskFromQuoteParams {
            task_id: task_id.clone(),
            task_number,
            title,
            client_id: quote.client_id.clone(),
            vehicle_plate: quote.vehicle_plate.clone(),
            vehicle_model: quote.vehicle_model.clone(),
            vehicle_make: quote.vehicle_make.clone(),
            vehicle_year: quote.vehicle_year.clone(),
            vehicle_vin: quote.vehicle_vin.clone(),
            notes: quote.notes.clone(),
            created_by: quote.created_by.clone(),
            now,
            scheduled_date,
        };

        self.repo
            .create_task_from_quote(&params)
            .map_err(|e| format!("Failed to create task from quote: {}", e))?;

        Ok(task_id)
    }
}
