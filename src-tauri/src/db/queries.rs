//! Database query execution module
//!
//! This module provides methods for executing various types of database queries
//! with proper error handling and optional performance metrics.

use crate::db::{Database, DbResult, QueryMetrics};
use rusqlite::Row;
use std::time::Instant;

/// Query execution implementation
impl Database {
    /// Execute SQL statement
    pub fn execute(&self, sql: &str, params: impl rusqlite::Params) -> DbResult<usize> {
        let start = Instant::now();
        let conn = self.get_connection()?;
        let result = conn.execute(sql, params).map_err(|e| e.to_string());
        let duration = start.elapsed().as_millis() as u64;

        if self.metrics_enabled {
            let rows_affected = result.as_ref().ok().copied();
            let metrics = QueryMetrics::new(sql.to_string(), duration, rows_affected);
            self.log_metrics(&metrics);
        }

        result
    }

    /// Query single row and map to type
    pub fn query_single<T>(&self, sql: &str, params: impl rusqlite::Params) -> DbResult<T>
    where
        T: crate::db::FromSqlRow,
    {
        let conn = self.get_connection()?;
        conn.query_row(sql, params, |row| T::from_row(row))
            .map_err(|e| e.to_string())
    }

    /// Query multiple rows and map to Vec<T>
    pub fn query_as<T>(&self, sql: &str, params: impl rusqlite::Params) -> DbResult<Vec<T>>
    where
        T: crate::db::FromSqlRow,
    {
        let start = Instant::now();
        let conn = self.get_connection()?;
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params, |row| T::from_row(row))
            .map_err(|e| e.to_string())?;
        let result = rows
            .collect::<Result<Vec<T>, _>>()
            .map_err(|e| e.to_string());
        let duration = start.elapsed().as_millis() as u64;

        if self.metrics_enabled {
            let row_count = result.as_ref().ok().map(|r| r.len());
            let metrics = QueryMetrics::new(sql.to_string(), duration, row_count);
            self.log_metrics(&metrics);
        }

        result
    }

    /// Query single value (for aggregates like COUNT)
    pub fn query_single_value<T>(&self, sql: &str, params: impl rusqlite::Params) -> DbResult<T>
    where
        T: rusqlite::types::FromSql,
    {
        let conn = self.get_connection()?;
        conn.query_row(sql, params, |row| row.get(0))
            .map_err(|e| e.to_string())
    }

    /// Query single row with multiple columns as tuple
    pub fn query_row_tuple<T, F>(
        &self,
        sql: &str,
        params: impl rusqlite::Params,
        f: F,
    ) -> DbResult<T>
    where
        F: FnOnce(&Row) -> rusqlite::Result<T>,
    {
        let conn = self.get_connection()?;
        conn.query_row(sql, params, f).map_err(|e| e.to_string())
    }

    /// Query single row and map to Option<T>
    pub fn query_single_as<T>(
        &self,
        sql: &str,
        params: impl rusqlite::Params,
    ) -> DbResult<Option<T>>
    where
        T: crate::db::FromSqlRow,
    {
        let conn = self.get_connection()?;
        let result = conn.query_row(sql, params, |row| T::from_row(row));
        match result {
            Ok(item) => Ok(Some(item)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    /// Query multiple rows with custom mapping function
    pub fn query_multiple<T, F>(
        &self,
        sql: &str,
        params: impl rusqlite::Params,
        mapper: F,
    ) -> DbResult<Vec<T>>
    where
        F: Fn(&Row) -> rusqlite::Result<T>,
    {
        let start = Instant::now();
        let conn = self.get_connection()?;
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params, mapper).map_err(|e| e.to_string())?;
        let result = rows
            .collect::<Result<Vec<T>, _>>()
            .map_err(|e| e.to_string());
        let duration = start.elapsed().as_millis() as u64;

        if self.metrics_enabled {
            let row_count = result.as_ref().ok().map(|r| r.len());
            let metrics = QueryMetrics::new(sql.to_string(), duration, row_count);
            self.log_metrics(&metrics);
        }

        result
    }
}
