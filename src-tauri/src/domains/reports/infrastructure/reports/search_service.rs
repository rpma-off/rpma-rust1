//! Search service
//!
//! This service handles entity search and filtering operations.

use crate::commands::{AppError, AppResult, AppState};
use crate::db::Database;
use crate::models::reports::*;
use crate::models::sync::EntityType;
use rusqlite::types::Value;
use std::collections::HashMap;

fn normalize_limit(limit: i32) -> i64 {
    limit.clamp(1, 200) as i64
}

fn push_in_clause(
    sql: &mut String,
    params: &mut Vec<Value>,
    column: &str,
    values: Option<&Vec<String>>,
) {
    if let Some(values) = values {
        if values.is_empty() {
            return;
        }

        let placeholders = std::iter::repeat("?")
            .take(values.len())
            .collect::<Vec<_>>()
            .join(",");

        sql.push_str(&format!(" AND {column} IN ({placeholders})"));
        for value in values {
            params.push(Value::Text(value.clone()));
        }
    }
}

fn push_like_any_clause(
    sql: &mut String,
    params: &mut Vec<Value>,
    column: &str,
    values: Option<&Vec<String>>,
) {
    if let Some(values) = values {
        if values.is_empty() {
            return;
        }

        let predicates = std::iter::repeat(format!("{column} LIKE ?"))
            .take(values.len())
            .collect::<Vec<_>>()
            .join(" OR ");
        sql.push_str(" AND (");
        sql.push_str(&predicates);
        sql.push(')');

        for value in values {
            params.push(Value::Text(format!("%{}%", value)));
        }
    }
}

fn search_tasks_with_db(
    query: &str,
    filters: &SearchFilters,
    limit: i32,
    db: &Database,
) -> AppResult<Vec<SearchResult>> {
    let safe_limit = normalize_limit(limit);

    let mut sql = String::from(
        "SELECT id,
                COALESCE(title, ''),
                COALESCE(task_number, ''),
                customer_name,
                status,
                scheduled_date,
                priority,
                technician_id,
                client_id
         FROM tasks
         WHERE deleted_at IS NULL
           AND (title LIKE ? OR task_number LIKE ? OR COALESCE(customer_name, '') LIKE ?)",
    );

    let query_pattern = format!("%{}%", query);
    let mut params: Vec<Value> = vec![
        Value::Text(query_pattern.clone()),
        Value::Text(query_pattern.clone()),
        Value::Text(query_pattern),
    ];

    push_in_clause(
        &mut sql,
        &mut params,
        "technician_id",
        filters.technician_ids.as_ref(),
    );
    push_in_clause(
        &mut sql,
        &mut params,
        "client_id",
        filters.client_ids.as_ref(),
    );
    push_in_clause(&mut sql, &mut params, "status", filters.statuses.as_ref());
    push_in_clause(
        &mut sql,
        &mut params,
        "priority",
        filters.priorities.as_ref(),
    );
    push_like_any_clause(
        &mut sql,
        &mut params,
        "COALESCE(vehicle_model, '')",
        filters.vehicle_models.as_ref(),
    );
    push_like_any_clause(
        &mut sql,
        &mut params,
        "COALESCE(ppf_zones, '')",
        filters.ppf_zones.as_ref(),
    );

    sql.push_str(" ORDER BY updated_at DESC LIMIT ?");
    params.push(Value::Integer(safe_limit));

    db.query_multiple(&sql, rusqlite::params_from_iter(params), |row| {
        let id: String = row.get(0)?;
        let title: String = row.get(1)?;
        let task_number: String = row.get(2)?;
        let customer_name: Option<String> = row.get(3)?;
        let status: Option<String> = row.get(4)?;
        let scheduled_date: Option<String> = row.get(5)?;
        let priority: Option<String> = row.get(6)?;
        let technician_id: Option<String> = row.get(7)?;
        let client_id: Option<String> = row.get(8)?;

        let mut metadata = HashMap::new();
        metadata.insert("task_number".to_string(), task_number.clone());
        if let Some(priority) = &priority {
            metadata.insert("priority".to_string(), priority.clone());
        }
        if let Some(technician_id) = &technician_id {
            metadata.insert("technician_id".to_string(), technician_id.clone());
        }
        if let Some(client_id) = &client_id {
            metadata.insert("client_id".to_string(), client_id.clone());
        }

        let resolved_title = if title.trim().is_empty() {
            format!("Task {}", task_number)
        } else {
            title
        };

        let subtitle = customer_name
            .filter(|name| !name.trim().is_empty())
            .map(|name| format!("Client: {}", name))
            .unwrap_or_else(|| format!("Task #{}", task_number));

        Ok(SearchResult {
            id,
            entity_type: EntityType::Task,
            title: resolved_title,
            subtitle,
            status,
            date: scheduled_date,
            metadata,
        })
    })
    .map_err(|e| AppError::Database(format!("Failed to search tasks: {}", e)))
}

fn search_clients_with_db(
    query: &str,
    filters: &SearchFilters,
    limit: i32,
    db: &Database,
) -> AppResult<Vec<SearchResult>> {
    let safe_limit = normalize_limit(limit);

    let mut sql = String::from(
        "SELECT id,
                COALESCE(name, ''),
                email,
                phone,
                customer_type,
                CAST(updated_at AS TEXT)
         FROM clients
         WHERE deleted_at IS NULL
           AND (name LIKE ? OR COALESCE(email, '') LIKE ? OR COALESCE(phone, '') LIKE ?)",
    );

    let query_pattern = format!("%{}%", query);
    let mut params: Vec<Value> = vec![
        Value::Text(query_pattern.clone()),
        Value::Text(query_pattern.clone()),
        Value::Text(query_pattern),
    ];

    push_in_clause(&mut sql, &mut params, "id", filters.client_ids.as_ref());

    sql.push_str(" ORDER BY updated_at DESC LIMIT ?");
    params.push(Value::Integer(safe_limit));

    db.query_multiple(&sql, rusqlite::params_from_iter(params), |row| {
        let id: String = row.get(0)?;
        let name: String = row.get(1)?;
        let email: Option<String> = row.get(2)?;
        let phone: Option<String> = row.get(3)?;
        let customer_type: Option<String> = row.get(4)?;
        let updated_at: Option<String> = row.get(5)?;

        let mut metadata = HashMap::new();
        if let Some(customer_type) = &customer_type {
            metadata.insert("customer_type".to_string(), customer_type.clone());
        }
        if let Some(email) = &email {
            metadata.insert("email".to_string(), email.clone());
        }
        if let Some(phone) = &phone {
            metadata.insert("phone".to_string(), phone.clone());
        }

        let subtitle = email
            .or(phone)
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| "Client record".to_string());

        Ok(SearchResult {
            id,
            entity_type: EntityType::Client,
            title: if name.trim().is_empty() {
                "Unnamed Client".to_string()
            } else {
                name
            },
            subtitle,
            status: None,
            date: updated_at,
            metadata,
        })
    })
    .map_err(|e| AppError::Database(format!("Failed to search clients: {}", e)))
}

fn search_interventions_with_db(
    query: &str,
    filters: &SearchFilters,
    limit: i32,
    db: &Database,
) -> AppResult<Vec<SearchResult>> {
    let safe_limit = normalize_limit(limit);

    let mut sql = String::from(
        "SELECT id,
                task_id,
                status,
                vehicle_plate,
                technician_name,
                client_id,
                CAST(started_at AS TEXT),
                CAST(updated_at AS TEXT)
         FROM interventions
         WHERE (id LIKE ? OR COALESCE(task_id, '') LIKE ? OR COALESCE(vehicle_plate, '') LIKE ?
                OR COALESCE(technician_name, '') LIKE ? OR COALESCE(client_name, '') LIKE ?)",
    );

    let query_pattern = format!("%{}%", query);
    let mut params: Vec<Value> = vec![
        Value::Text(query_pattern.clone()),
        Value::Text(query_pattern.clone()),
        Value::Text(query_pattern.clone()),
        Value::Text(query_pattern.clone()),
        Value::Text(query_pattern),
    ];

    push_in_clause(
        &mut sql,
        &mut params,
        "technician_id",
        filters.technician_ids.as_ref(),
    );
    push_in_clause(
        &mut sql,
        &mut params,
        "client_id",
        filters.client_ids.as_ref(),
    );
    push_in_clause(&mut sql, &mut params, "status", filters.statuses.as_ref());

    sql.push_str(" ORDER BY updated_at DESC LIMIT ?");
    params.push(Value::Integer(safe_limit));

    db.query_multiple(&sql, rusqlite::params_from_iter(params), |row| {
        let id: String = row.get(0)?;
        let task_id: Option<String> = row.get(1)?;
        let status: Option<String> = row.get(2)?;
        let vehicle_plate: Option<String> = row.get(3)?;
        let technician_name: Option<String> = row.get(4)?;
        let client_id: Option<String> = row.get(5)?;
        let started_at: Option<String> = row.get(6)?;
        let updated_at: Option<String> = row.get(7)?;

        let mut metadata = HashMap::new();
        if let Some(task_id) = &task_id {
            metadata.insert("task_id".to_string(), task_id.clone());
        }
        if let Some(vehicle_plate) = &vehicle_plate {
            metadata.insert("vehicle_plate".to_string(), vehicle_plate.clone());
        }
        if let Some(technician_name) = &technician_name {
            metadata.insert("technician_name".to_string(), technician_name.clone());
        }
        if let Some(client_id) = &client_id {
            metadata.insert("client_id".to_string(), client_id.clone());
        }

        let subtitle_left = task_id
            .map(|task_id| format!("Task {}", task_id))
            .unwrap_or_else(|| "Intervention".to_string());
        let subtitle_right = technician_name.unwrap_or_else(|| "Unassigned".to_string());

        Ok(SearchResult {
            id: id.clone(),
            entity_type: EntityType::Intervention,
            title: vehicle_plate.unwrap_or_else(|| format!("Intervention {}", id)),
            subtitle: format!("{subtitle_left} | {subtitle_right}"),
            status,
            date: started_at.or(updated_at),
            metadata,
        })
    })
    .map_err(|e| AppError::Database(format!("Failed to search interventions: {}", e)))
}

/// Search service for entity filtering and discovery
pub struct SearchReportService;

impl SearchReportService {
    /// Search tasks with query and filters
    pub async fn search_tasks(
        _query: &str,
        _filters: &SearchFilters,
        _limit: i32,
        _session_token: &str,
        _state: &AppState<'_>,
    ) -> AppResult<Vec<SearchResult>> {
        search_tasks_with_db(_query, _filters, _limit, _state.db.as_ref())
    }

    /// Search clients with query and filters
    pub async fn search_clients(
        _query: &str,
        _filters: &SearchFilters,
        _limit: i32,
        _session_token: &str,
        _state: &AppState<'_>,
    ) -> AppResult<Vec<SearchResult>> {
        search_clients_with_db(_query, _filters, _limit, _state.db.as_ref())
    }

    /// Search interventions with query and filters
    pub async fn search_interventions(
        _query: &str,
        _filters: &SearchFilters,
        _limit: i32,
        _session_token: &str,
        _state: &AppState<'_>,
    ) -> AppResult<Vec<SearchResult>> {
        search_interventions_with_db(_query, _filters, _limit, _state.db.as_ref())
    }

    /// Search across all entities
    pub async fn search_records(
        _query: &str,
        _entity_types: &[String],
        _limit: i32,
        _db: &crate::db::Database,
    ) -> AppResult<SearchResults> {
        let normalized = normalize_limit(_limit) as i32;
        let filters = SearchFilters::default();

        let include_all = _entity_types.is_empty();
        let include_tasks = include_all
            || _entity_types
                .iter()
                .any(|t| t.eq_ignore_ascii_case("tasks"));
        let include_clients = include_all
            || _entity_types
                .iter()
                .any(|t| t.eq_ignore_ascii_case("clients"));
        let include_interventions = include_all
            || _entity_types
                .iter()
                .any(|t| t.eq_ignore_ascii_case("interventions"));

        let tasks = if include_tasks {
            _db.query_as::<crate::models::task::Task>(
                "SELECT * FROM tasks WHERE deleted_at IS NULL AND (title LIKE ? OR task_number LIKE ? OR COALESCE(customer_name, '') LIKE ?) ORDER BY updated_at DESC LIMIT ?",
                rusqlite::params![
                    format!("%{}%", _query),
                    format!("%{}%", _query),
                    format!("%{}%", _query),
                    normalized
                ],
            )
            .map_err(|e| AppError::Database(format!("Failed to search task records: {}", e)))?
        } else {
            Vec::new()
        };

        let clients = if include_clients {
            _db.query_as::<crate::models::client::Client>(
                "SELECT * FROM clients WHERE deleted_at IS NULL AND (name LIKE ? OR COALESCE(email, '') LIKE ? OR COALESCE(phone, '') LIKE ?) ORDER BY updated_at DESC LIMIT ?",
                rusqlite::params![
                    format!("%{}%", _query),
                    format!("%{}%", _query),
                    format!("%{}%", _query),
                    normalized
                ],
            )
            .map_err(|e| AppError::Database(format!("Failed to search client records: {}", e)))?
        } else {
            Vec::new()
        };

        let interventions = if include_interventions {
            let repo = crate::repositories::intervention_repository::InterventionRepository::new(
                std::sync::Arc::new(_db.clone()),
            );

            search_interventions_with_db(_query, &filters, normalized, _db)?
                .into_iter()
                .filter_map(|result| repo.get_intervention(&result.id).ok().flatten())
                .collect::<Vec<_>>()
        } else {
            Vec::new()
        };

        let total_results = tasks.len() + clients.len() + interventions.len();

        Ok(SearchResults {
            tasks,
            clients,
            interventions,
            total_results: total_results as i32,
        })
    }
}
