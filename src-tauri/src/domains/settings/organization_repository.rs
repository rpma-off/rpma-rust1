//! Organization repository for database operations

/// ADR-005: Repository Pattern
use std::sync::Arc;
use rusqlite::params;
use tracing::{debug, error, info};

use crate::db::Database;
use crate::db::FromSqlRow;
use crate::commands::AppError;
use super::models::*;

pub struct OrganizationRepository {
    db: Arc<Database>,
}

impl OrganizationRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    pub fn get_organization(&self) -> Result<Option<Organization>, AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        let result = conn.query_row(
            "SELECT id, name, slug, legal_name, tax_id, siret, registration_number,
                    email, phone, website, address_street, address_city, address_state,
                    address_zip, address_country, logo_url, logo_data, primary_color,
                    secondary_color, accent_color, business_settings, invoice_settings,
                    industry, company_size, created_at, updated_at
             FROM organizations WHERE id = 'default'",
            [],
            |row| Organization::from_row(row),
        );

        match result {
            Ok(org) => Ok(Some(org)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => {
                error!("Failed to get organization: {}", e);
                Err(AppError::Database(format!(
                    "Failed to get organization: {}",
                    e
                )))
            }
        }
    }

    pub fn create_organization(
        &self,
        request: &CreateOrganizationRequest,
    ) -> Result<Organization, AppError> {
        request.validate().map_err(|e| AppError::Validation(e))?;

        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        let now = chrono::Utc::now().timestamp_millis();

        conn.execute(
            "INSERT INTO organizations (
                id, name, slug, legal_name, tax_id, siret, registration_number,
                email, phone, website, address_street, address_city, address_state,
                address_zip, address_country, industry, company_size, created_at, updated_at
            ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                request.name,
                request.slug,
                request.legal_name,
                request.tax_id,
                request.siret,
                request.registration_number,
                request.email,
                request.phone,
                request.website,
                request.address_street,
                request.address_city,
                request.address_state,
                request.address_zip,
                request.address_country,
                request.industry,
                request.company_size,
                now,
                now,
            ],
        )
        .map_err(|e| {
            error!("Failed to create organization: {}", e);
            AppError::Database(format!("Failed to create organization: {}", e))
        })?;

        info!("Organization created: {}", request.name);
        self.get_organization()?
            .ok_or_else(|| AppError::Internal("Organization created but not found".to_string()))
    }

    pub fn update_organization(
        &self,
        request: &UpdateOrganizationRequest,
    ) -> Result<Organization, AppError> {
        let existing = self
            .get_organization()?
            .ok_or_else(|| AppError::NotFound("Organization not found".to_string()))?;

        let name = request.name.as_ref().unwrap_or(&existing.name);
        let now = chrono::Utc::now().timestamp_millis();

        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        conn.execute(
            "UPDATE organizations SET
                name = ?, slug = ?, legal_name = ?, tax_id = ?, siret = ?,
                registration_number = ?, email = ?, phone = ?, website = ?,
                address_street = ?, address_city = ?, address_state = ?,
                address_zip = ?, address_country = ?, logo_url = ?, logo_data = ?,
                primary_color = ?, secondary_color = ?, accent_color = ?,
                business_settings = ?, invoice_settings = ?,
                industry = ?, company_size = ?, updated_at = ?
             WHERE id = 'default'",
            params![
                name,
                request.slug.as_ref().or(existing.slug.as_ref()),
                request.legal_name.as_ref().or(existing.legal_name.as_ref()),
                request.tax_id.as_ref().or(existing.tax_id.as_ref()),
                request.siret.as_ref().or(existing.siret.as_ref()),
                request
                    .registration_number
                    .as_ref()
                    .or(existing.registration_number.as_ref()),
                request.email.as_ref().or(existing.email.as_ref()),
                request.phone.as_ref().or(existing.phone.as_ref()),
                request.website.as_ref().or(existing.website.as_ref()),
                request
                    .address_street
                    .as_ref()
                    .or(existing.address_street.as_ref()),
                request
                    .address_city
                    .as_ref()
                    .or(existing.address_city.as_ref()),
                request
                    .address_state
                    .as_ref()
                    .or(existing.address_state.as_ref()),
                request
                    .address_zip
                    .as_ref()
                    .or(existing.address_zip.as_ref()),
                request
                    .address_country
                    .as_ref()
                    .or(existing.address_country.as_ref()),
                request.logo_url.as_ref().or(existing.logo_url.as_ref()),
                request.logo_data.as_ref().or(existing.logo_data.as_ref()),
                request
                    .primary_color
                    .as_ref()
                    .or(existing.primary_color.as_ref()),
                request
                    .secondary_color
                    .as_ref()
                    .or(existing.secondary_color.as_ref()),
                request
                    .accent_color
                    .as_ref()
                    .or(existing.accent_color.as_ref()),
                request
                    .business_settings
                    .as_ref()
                    .or(existing.business_settings.as_ref()),
                request
                    .invoice_settings
                    .as_ref()
                    .or(existing.invoice_settings.as_ref()),
                request.industry.as_ref().or(existing.industry.as_ref()),
                request
                    .company_size
                    .as_ref()
                    .or(existing.company_size.as_ref()),
                now,
            ],
        )
        .map_err(|e| {
            error!("Failed to update organization: {}", e);
            AppError::Database(format!("Failed to update organization: {}", e))
        })?;

        info!("Organization updated: {}", name);
        self.get_organization()?
            .ok_or_else(|| AppError::Internal("Organization updated but not found".to_string()))
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<OrganizationSetting>, AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        let result = conn.query_row(
            "SELECT key, value, category, updated_at FROM organization_settings WHERE key = ?",
            [key],
            |row| OrganizationSetting::from_row(row),
        );

        match result {
            Ok(setting) => Ok(Some(setting)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => {
                error!("Failed to get setting '{}': {}", key, e);
                Err(AppError::Database(format!("Failed to get setting: {}", e)))
            }
        }
    }

    pub fn set_setting(&self, key: &str, value: &str, category: &str) -> Result<(), AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        let now = chrono::Utc::now().timestamp_millis();

        conn.execute(
            "INSERT INTO organization_settings (key, value, category, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, category = excluded.category, updated_at = excluded.updated_at",
            params![key, value, category, now],
        ).map_err(|e| {
            error!("Failed to set setting '{}': {}", key, e);
            AppError::Database(format!("Failed to set setting: {}", e))
        })?;

        debug!("Setting '{}' updated", key);
        Ok(())
    }

    pub fn get_settings_by_category(
        &self,
        category: &str,
    ) -> Result<Vec<OrganizationSetting>, AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        let mut stmt = conn.prepare(
            "SELECT key, value, category, updated_at FROM organization_settings WHERE category = ?"
        ).map_err(|e| {
            error!("Failed to prepare statement: {}", e);
            AppError::Database(format!("Failed to prepare statement: {}", e))
        })?;

        let settings = stmt
            .query_map([category], |row| OrganizationSetting::from_row(row))
            .map_err(|e| {
                error!("Failed to query settings: {}", e);
                AppError::Database(format!("Failed to query settings: {}", e))
            })?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| {
                error!("Failed to collect settings: {}", e);
                AppError::Database(format!("Failed to collect settings: {}", e))
            })?;

        Ok(settings)
    }

    pub fn get_all_settings(&self) -> Result<OrganizationSettings, AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        let mut stmt = conn
            .prepare("SELECT key, value, category, updated_at FROM organization_settings")
            .map_err(|e| {
                error!("Failed to prepare statement: {}", e);
                AppError::Database(format!("Failed to prepare statement: {}", e))
            })?;

        let settings_map: std::collections::HashMap<String, String> = stmt
            .query_map([], |row| {
                let key: String = row.get(0)?;
                let value: String = row.get(1)?;
                Ok((key, value))
            })
            .map_err(|e| {
                error!("Failed to query settings: {}", e);
                AppError::Database(format!("Failed to query settings: {}", e))
            })?
            .filter_map(|r| r.ok())
            .collect();

        Ok(OrganizationSettings {
            system: SystemSettings {
                onboarding_completed: settings_map
                    .get("onboarding_completed")
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(false),
                onboarding_step: settings_map
                    .get("onboarding_step")
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(0),
            },
            tasks: TaskSettings {
                default_task_priority: settings_map
                    .get("default_task_priority")
                    .cloned()
                    .unwrap_or_else(|| "medium".to_string()),
            },
            security: OrgSecuritySettings {
                default_session_timeout: settings_map
                    .get("default_session_timeout")
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(480),
                require_2fa: settings_map
                    .get("require_2fa")
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(false),
            },
            regional: RegionalSettings {
                date_format: settings_map
                    .get("date_format")
                    .cloned()
                    .unwrap_or_else(|| "DD/MM/YYYY".to_string()),
                time_format: settings_map
                    .get("time_format")
                    .cloned()
                    .unwrap_or_else(|| "24h".to_string()),
                currency: settings_map
                    .get("currency")
                    .cloned()
                    .unwrap_or_else(|| "EUR".to_string()),
                language: settings_map
                    .get("language")
                    .cloned()
                    .unwrap_or_else(|| "fr".to_string()),
                timezone: settings_map
                    .get("timezone")
                    .cloned()
                    .unwrap_or_else(|| "Europe/Paris".to_string()),
            },
            invoicing: InvoicingSettings {
                invoice_prefix: settings_map
                    .get("invoice_prefix")
                    .cloned()
                    .unwrap_or_else(|| "INV-".to_string()),
                invoice_next_number: settings_map
                    .get("invoice_next_number")
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(1),
                quote_prefix: settings_map
                    .get("quote_prefix")
                    .cloned()
                    .unwrap_or_else(|| "QT-".to_string()),
                quote_next_number: settings_map
                    .get("quote_next_number")
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(1),
                quote_validity_days: settings_map
                    .get("quote_validity_days")
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(30),
                payment_terms: settings_map
                    .get("payment_terms")
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(30),
            },
            business: BusinessSettings {
                business_hours_start: settings_map
                    .get("business_hours_start")
                    .cloned()
                    .unwrap_or_else(|| "08:00".to_string()),
                business_hours_end: settings_map
                    .get("business_hours_end")
                    .cloned()
                    .unwrap_or_else(|| "18:00".to_string()),
                business_days: settings_map
                    .get("business_days")
                    .and_then(|v| serde_json::from_str(v).ok())
                    .unwrap_or_else(|| {
                        vec![
                            "1".to_string(),
                            "2".to_string(),
                            "3".to_string(),
                            "4".to_string(),
                            "5".to_string(),
                        ]
                    }),
            },
        })
    }

    pub fn update_settings(
        &self,
        settings: &std::collections::HashMap<String, String>,
    ) -> Result<(), AppError> {
        for (key, value) in settings {
            let category = Self::get_category_for_key(key);
            self.set_setting(key, value, &category)?;
        }
        Ok(())
    }

    fn get_category_for_key(key: &str) -> &'static str {
        match key {
            k if k.starts_with("onboarding") || k == "system_" => "system",
            k if k.contains("task") || k.contains("priority") => "tasks",
            k if k.contains("session") || k.contains("2fa") || k.contains("security") => "security",
            k if k.contains("date")
                || k.contains("time")
                || k.contains("currency")
                || k.contains("language")
                || k.contains("timezone") =>
            {
                "regional"
            }
            k if k.contains("invoice") || k.contains("quote") || k.contains("payment") => {
                "invoicing"
            }
            k if k.contains("business") || k.contains("hours") => "business",
            _ => "general",
        }
    }

    pub fn get_onboarding_status(&self) -> Result<(bool, i32), AppError> {
        let completed = self
            .get_setting("onboarding_completed")?
            .map(|s| s.value == "true")
            .unwrap_or(false);

        let step = self
            .get_setting("onboarding_step")?
            .and_then(|s| s.value.parse().ok())
            .unwrap_or(0);

        Ok((completed, step))
    }

    pub fn complete_onboarding(&self) -> Result<(), AppError> {
        self.set_setting("onboarding_completed", "true", "system")?;
        self.set_setting("onboarding_step", "3", "system")?;
        info!("Onboarding completed");
        Ok(())
    }

    pub fn has_admin_users(&self) -> Result<bool, AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = 1",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        Ok(count > 0)
    }
}
