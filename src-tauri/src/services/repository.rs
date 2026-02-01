//! Repository pattern for database abstraction
//!
//! This module provides a generic repository pattern that abstracts
//! database operations and enables better testability and separation of concerns.

use std::sync::Arc;
use async_trait::async_trait;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// Generic repository trait for CRUD operations
#[async_trait]
pub trait Repository<T, ID>: Send + Sync {
    /// Create a new entity
    async fn create(&self, entity: &T) -> Result<T, String>;
    
    /// Get an entity by ID
    async fn get_by_id(&self, id: &ID) -> Result<Option<T>, String>;
    
    /// Update an existing entity
    async fn update(&self, entity: &T) -> Result<T, String>;
    
    /// Delete an entity by ID
    async fn delete(&self, id: &ID) -> Result<bool, String>;
    
    /// List all entities with pagination
    async fn list(&self, limit: i32, offset: i32) -> Result<Vec<T>, String>;
    
    /// Count all entities
    async fn count(&self) -> Result<i64, String>;
    
    /// Find entities by criteria
    async fn find(&self, criteria: &FindCriteria) -> Result<Vec<T>, String>;
    
    /// Find one entity by criteria
    async fn find_one(&self, criteria: &FindCriteria) -> Result<Option<T>, String>;
}

/// Query criteria for find operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FindCriteria {
    /// Field filters (field_name -> value)
    pub filters: std::collections::HashMap<String, FilterValue>,
    
    /// Sort order (field_name -> direction)
    pub sort: std::collections::HashMap<String, SortDirection>,
    
    /// Limit for results
    pub limit: Option<i32>,
    
    /// Offset for pagination
    pub offset: Option<i32>,
}

/// Filter value types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum FilterValue {
    String(String),
    Number(f64),
    Boolean(bool),
    Array(Vec<String>),
    Date(DateTime<Utc>),
    Range(DateRange),
}

/// Date range for filtering
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DateRange {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
}

/// Sort direction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SortDirection {
    Asc,
    Desc,
}

/// Transaction trait for atomic operations
#[async_trait]
pub trait Transaction: Send + Sync {
    /// Commit the transaction
    async fn commit(&self) -> Result<(), String>;
    
    /// Rollback the transaction
    async fn rollback(&self) -> Result<(), String>;
}

/// Unit of work trait for managing transactions
#[async_trait]
pub trait UnitOfWork: Send + Sync {
    /// Begin a new transaction
    async fn begin(&self) -> Result<Box<dyn Transaction>, String>;
    
    /// Get repository for a specific entity type
    fn get_repository<T, ID>(&self) -> Result<Box<dyn Repository<T, ID>>, String>
    where
        T: Send + Sync + 'static,
        ID: Send + Sync + 'static;
}

/// Generic entity trait for repository operations
pub trait Entity: Send + Sync {
    type Id;
    
    /// Get the entity ID
    fn id(&self) -> &Self::Id;
    
    /// Set the entity ID
    fn set_id(&mut self, id: Self::Id);
    
    /// Get the entity version for optimistic locking
    fn version(&self) -> i64;
    
    /// Set the entity version
    fn set_version(&mut self, version: i64);
    
    /// Get the created timestamp
    fn created_at(&self) -> DateTime<Utc>;
    
    /// Set the created timestamp
    fn set_created_at(&mut self, created_at: DateTime<Utc>);
    
    /// Get the updated timestamp
    fn updated_at(&self) -> DateTime<Utc>;
    
    /// Set the updated timestamp
    fn set_updated_at(&mut self, updated_at: DateTime<Utc>);
}

/// SQLite-based repository implementation
pub struct SqliteRepository<T, ID> {
    db: Arc<crate::db::Database>,
    table_name: String,
    _phantom: std::marker::PhantomData<(T, ID)>,
}

impl<T, ID> SqliteRepository<T, ID> {
    /// Create a new SQLite repository
    pub fn new(db: Arc<crate::db::Database>, table_name: String) -> Self {
        Self {
            db,
            table_name,
            _phantom: std::marker::PhantomData,
        }
    }

    /// Build WHERE clause from criteria
    fn build_where_clause(&self, criteria: &FindCriteria) -> (String, Vec<rusqlite::Params>) {
        let mut where_conditions = Vec::new();
        let mut params = Vec::new();
        
        for (field, filter) in &criteria.filters {
            match filter {
                FilterValue::String(value) => {
                    where_conditions.push(format!("{} = ?", field));
                    params.push(rusqlite::types::Value::from(value.clone()));
                }
                FilterValue::Number(value) => {
                    where_conditions.push(format!("{} = ?", field));
                    params.push(rusqlite::types::Value::from(*value));
                }
                FilterValue::Boolean(value) => {
                    where_conditions.push(format!("{} = ?", field));
                    params.push(rusqlite::types::Value::from(*value));
                }
                FilterValue::Array(values) => {
                    let placeholders: Vec<String> = values.iter().map(|_| "?".to_string()).collect();
                    where_conditions.push(format!("{} IN ({})", field, placeholders.join(",")));
                    for value in values {
                        params.push(rusqlite::types::Value::from(value.clone()));
                    }
                }
                FilterValue::Date(date) => {
                    where_conditions.push(format!("{} = ?", field));
                    params.push(rusqlite::types::Value::from(date.timestamp_millis()));
                }
                FilterValue::Range(range) => {
                    where_conditions.push(format!("{} BETWEEN ? AND ?", field));
                    params.push(rusqlite::types::Value::from(range.start.timestamp_millis()));
                    params.push(rusqlite::types::Value::from(range.end.timestamp_millis()));
                }
            }
        }
        
        let where_clause = if where_conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", where_conditions.join(" AND "))
        };
        
        (where_clause, params)
    }

    /// Build ORDER BY clause from criteria
    fn build_order_clause(&self, criteria: &FindCriteria) -> String {
        if criteria.sort.is_empty() {
            return String::new();
        }
        
        let mut order_clauses = Vec::new();
        for (field, direction) in &criteria.sort {
            let direction_str = match direction {
                SortDirection::Asc => "ASC",
                SortDirection::Desc => "DESC",
            };
            order_clauses.push(format!("{} {}", field, direction_str));
        }
        
        format!("ORDER BY {}", order_clauses.join(", "))
    }

    /// Build LIMIT and OFFSET clause from criteria
    fn build_limit_offset_clause(&self, criteria: &FindCriteria) -> String {
        let mut clause_parts = Vec::new();
        
        if let Some(limit) = criteria.limit {
            clause_parts.push(format!("LIMIT {}", limit));
        }
        
        if let Some(offset) = criteria.offset {
            clause_parts.push(format!("OFFSET {}", offset));
        }
        
        clause_parts.join(" ")
    }

    /// Convert entity to parameter values for INSERT/UPDATE
    fn entity_to_params(&self, entity: &T) -> Result<Vec<rusqlite::types::Value>, String> {
        // This would need to be implemented for each entity type
        // For now, return empty parameters
        Ok(Vec::new())
    }

    /// Convert row to entity
    fn row_to_entity(&self, row: &rusqlite::Row) -> Result<T, String> {
        // This would need to be implemented for each entity type
        // For now, return an error
        Err("Entity conversion not implemented".to_string())
    }
}

#[async_trait]
impl<T, ID> Repository<T, ID> for SqliteRepository<T, ID>
where
    T: Entity + Send + Sync + serde::de::DeserializeOwned + serde::Serialize,
    ID: Send + Sync + serde::Serialize + for<'de> serde::Deserialize<'de>,
{
    async fn create(&self, entity: &T) -> Result<T, String> {
        let conn = self.db.get_connection().map_err(|e| e.to_string())?;
        
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        
        // Create mutable copy to set ID and timestamps
        let mut new_entity = entity.clone();
        new_entity.set_id(serde_json::from_str(&id).map_err(|e| e.to_string())?);
        new_entity.set_created_at(now);
        new_entity.set_updated_at(now);
        new_entity.set_version(1);
        
        // This would need to be implemented for each entity type
        // For now, return the entity as is
        Ok(new_entity)
    }

    async fn get_by_id(&self, id: &ID) -> Result<Option<T>, String> {
        let conn = self.db.get_connection().map_err(|e| e.to_string())?;
        
        let query = format!(
            "SELECT * FROM {} WHERE id = ? LIMIT 1",
            self.table_name
        );
        
        let id_str = serde_json::to_string(id).map_err(|e| e.to_string())?;
        
        let mut stmt = conn
            .prepare(&query)
            .map_err(|e| e.to_string())?;
        
        let result = stmt
            .query_row([id_str], |row| self.row_to_entity(row))
            .optional()
            .map_err(|e| e.to_string())?;
        
        Ok(result)
    }

    async fn update(&self, entity: &T) -> Result<T, String> {
        let conn = self.db.get_connection().map_err(|e| e.to_string())?;
        
        // Update timestamp and version
        let mut updated_entity = entity.clone();
        updated_entity.set_updated_at(Utc::now());
        updated_entity.set_version(entity.version() + 1);
        
        // This would need to be implemented for each entity type
        // For now, return the entity as is
        Ok(updated_entity)
    }

    async fn delete(&self, id: &ID) -> Result<bool, String> {
        let conn = self.db.get_connection().map_err(|e| e.to_string())?;
        
        let query = format!("DELETE FROM {} WHERE id = ?", self.table_name);
        let id_str = serde_json::to_string(id).map_err(|e| e.to_string())?;
        
        let rows_affected = conn
            .execute(&query, [id_str])
            .map_err(|e| e.to_string())?;
        
        Ok(rows_affected > 0)
    }

    async fn list(&self, limit: i32, offset: i32) -> Result<Vec<T>, String> {
        let conn = self.db.get_connection().map_err(|e| e.to_string())?;
        
        let query = format!(
            "SELECT * FROM {} ORDER BY updated_at DESC LIMIT {} OFFSET {}",
            self.table_name, limit, offset
        );
        
        let mut stmt = conn
            .prepare(&query)
            .map_err(|e| e.to_string())?;
        
        let rows = stmt
            .query_map([], |row| self.row_to_entity(row))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        
        Ok(rows)
    }

    async fn count(&self) -> Result<i64, String> {
        let conn = self.db.get_connection().map_err(|e| e.to_string())?;
        
        let query = format!("SELECT COUNT(*) FROM {}", self.table_name);
        
        let count: i64 = conn
            .query_row(&query, [], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        
        Ok(count)
    }

    async fn find(&self, criteria: &FindCriteria) -> Result<Vec<T>, String> {
        let conn = self.db.get_connection().map_err(|e| e.to_string())?;
        
        let (where_clause, params) = self.build_where_clause(criteria);
        let order_clause = self.build_order_clause(criteria);
        let limit_offset_clause = self.build_limit_offset_clause(criteria);
        
        let query = format!(
            "SELECT * FROM {} {} {} {}",
            self.table_name, where_clause, order_clause, limit_offset_clause
        );
        
        let mut stmt = conn
            .prepare(&query)
            .map_err(|e| e.to_string())?;
        
        let rows = stmt
            .query_map(&*params, |row| self.row_to_entity(row))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        
        Ok(rows)
    }

    async fn find_one(&self, criteria: &FindCriteria) -> Result<Option<T>, String> {
        let mut limited_criteria = criteria.clone();
        limited_criteria.limit = Some(1);
        
        let results = self.find(&limited_criteria).await?;
        Ok(results.into_iter().next())
    }
}

/// SQLite transaction implementation
pub struct SqliteTransaction {
    conn: Arc<rusqlite::Connection>,
    committed: bool,
}

impl SqliteTransaction {
    /// Create a new transaction
    pub fn new(db: Arc<crate::db::Database>) -> Result<Self, String> {
        let conn = db.get_connection().map_err(|e| e.to_string())?;
        
        conn.execute("BEGIN IMMEDIATE", [])
            .map_err(|e| e.to_string())?;
        
        Ok(Self {
            conn: Arc::new(conn),
            committed: false,
        })
    }
}

#[async_trait]
impl Transaction for SqliteTransaction {
    async fn commit(&self) -> Result<(), String> {
        self.conn.execute("COMMIT", [])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn rollback(&self) -> Result<(), String> {
        self.conn.execute("ROLLBACK", [])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

/// SQLite unit of work implementation
pub struct SqliteUnitOfWork {
    db: Arc<crate::db::Database>,
    repositories: std::collections::HashMap<String, Box<dyn std::any::Any + Send + Sync>>,
}

impl SqliteUnitOfWork {
    /// Create a new unit of work
    pub fn new(db: Arc<crate::db::Database>) -> Self {
        Self {
            db,
            repositories: std::collections::HashMap::new(),
        }
    }
}

#[async_trait]
impl UnitOfWork for SqliteUnitOfWork {
    async fn begin(&self) -> Result<Box<dyn Transaction>, String> {
        SqliteTransaction::new(self.db.clone()).map(|tx| Box::new(tx) as Box<dyn Transaction>)
    }

    fn get_repository<T, ID>(&self) -> Result<Box<dyn Repository<T, ID>>, String>
    where
        T: Send + Sync + 'static,
        ID: Send + Sync + 'static,
    {
        let type_name = std::any::type_name::<T>();
        
        // Create repository for the entity type
        let table_name = self.get_table_name_for_type::<T>()?;
        let repository = SqliteRepository::new(self.db.clone(), table_name);
        
        Ok(Box::new(repository) as Box<dyn Repository<T, ID>>)
    }
}

impl SqliteUnitOfWork {
    /// Get table name for entity type
    fn get_table_name_for_type<T>(&self) -> Result<String, String> {
        let type_name = std::any::type_name::<T>();
        
        // Map Rust types to table names
        let table_name = match type_name {
            "rpma_ppf_intervention::models::task::Task" => "tasks",
            "rpma_ppf_intervention::models::intervention::Intervention" => "interventions",
            "rpma_ppf_intervention::models::client::Client" => "clients",
            "rpma_ppf_intervention::models::user::User" => "users",
            _ => {
                // Convert PascalCase to snake_case and pluralize
                let snake_case = type_name
                    .split("::")
                    .last()
                    .unwrap_or("")
                    .chars()
                    .map(|c| if c.is_uppercase() { format!("_{}", c.to_ascii_lowercase()) } else { c.to_string() })
                    .collect::<String>();
                format!("{}s", snake_case)
            }
        };
        
        Ok(table_name)
    }
}

/// Repository factory for creating repositories
pub struct RepositoryFactory {
    db: Arc<crate::db::Database>,
}

impl RepositoryFactory {
    /// Create a new repository factory
    pub fn new(db: Arc<crate::db::Database>) -> Self {
        Self { db }
    }

    /// Create a repository for the specified entity type
    pub fn create_repository<T, ID>(&self, table_name: &str) -> Box<dyn Repository<T, ID>>
    where
        T: Entity + Send + Sync + serde::de::DeserializeOwned + serde::Serialize,
        ID: Send + Sync + serde::Serialize + for<'de> serde::Deserialize<'de>,
    {
        Box::new(SqliteRepository::new(self.db.clone(), table_name.to_string()))
    }

    /// Create a unit of work
    pub fn create_unit_of_work(&self) -> Box<dyn UnitOfWork> {
        Box::new(SqliteUnitOfWork::new(self.db.clone()))
    }

    /// Get the underlying database connection
    pub fn get_db(&self) -> Arc<crate::db::Database> {
        self.db.clone()
    }
}

/// Macro for creating entity-specific repositories
#[macro_export]
macro_rules! create_repository {
    ($entity_type:ty, $id_type:ty, $table_name:expr) => {
        type $entity_type Repository = dyn $crate::repository::Repository<$entity_type, $id_type>;
        
        pub fn create_$entity_type:lower(
            db: std::sync::Arc<$crate::db::Database>,
        ) -> Box<$entity_type Repository> {
            $crate::repository::RepositoryFactory::new(db)
                .create_repository::<$entity_type, $id_type>($table_name)
        }
    };
}

// Example repository definitions
create_repository!(Task, String, "tasks");
create_repository!(Intervention, String, "interventions");
create_repository!(Client, String, "clients");
create_repository!(User, String, "users");