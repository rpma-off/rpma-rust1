//! Supplier repository — CRUD for `suppliers` table.

use crate::db::Database;
use crate::domains::inventory::domain::models::material::Supplier;
use rusqlite::params;
use uuid::Uuid;

use super::material::{CreateSupplierRequest, MaterialError, MaterialResult};

#[derive(Debug)]
pub(crate) struct SupplierRepository {
    db: Database,
}

impl SupplierRepository {
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Create a new supplier.
    pub fn create_supplier(
        &self,
        request: CreateSupplierRequest,
        created_by: Option<String>,
    ) -> MaterialResult<Supplier> {
        self.validate_create_supplier_request(&request)?;

        let id = Uuid::new_v4().to_string();

        let supplier = Supplier {
            id: id.clone(),
            name: request.name,
            code: request.code,
            contact_person: request.contact_person,
            email: request.email,
            phone: request.phone,
            website: request.website,
            address_street: request.address_street,
            address_city: request.address_city,
            address_state: request.address_state,
            address_zip: request.address_zip,
            address_country: request.address_country,
            tax_id: request.tax_id,
            business_license: request.business_license,
            payment_terms: request.payment_terms,
            lead_time_days: request.lead_time_days.unwrap_or(0),
            is_active: true,
            is_preferred: request.is_preferred.unwrap_or(false),
            quality_rating: request.quality_rating,
            delivery_rating: request.delivery_rating,
            on_time_delivery_rate: request.on_time_delivery_rate,
            notes: request.notes,
            special_instructions: request.special_instructions,
            created_at: crate::shared::contracts::common::now(),
            updated_at: crate::shared::contracts::common::now(),
            created_by,
            updated_by: None,
            synced: false,
            last_synced_at: None,
        };

        self.save_supplier(&supplier)?;
        Ok(supplier)
    }

    /// Get supplier by ID.
    pub fn get_supplier(&self, id: &str) -> MaterialResult<Option<Supplier>> {
        let sql = "SELECT * FROM suppliers WHERE id = ?";
        let suppliers = self.db.query_as::<Supplier>(sql, params![id])?;
        Ok(suppliers.into_iter().next())
    }

    /// List suppliers with optional filters and pagination.
    ///
    /// Bug fix: previously the LIMIT/OFFSET placeholders were appended to the SQL
    /// string but the actual values were never bound, making pagination silently ignored.
    pub fn list_suppliers(
        &self,
        active_only: bool,
        preferred_only: Option<bool>,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> MaterialResult<Vec<Supplier>> {
        let mut sql = "SELECT * FROM suppliers".to_string();
        let mut conditions: Vec<String> = Vec::new();
        let mut param_values: Vec<String> = Vec::new();

        if active_only {
            conditions.push("is_active = 1".to_string());
        }

        if let Some(preferred) = preferred_only {
            conditions.push(format!("is_preferred = {}", if preferred { 1 } else { 0 }));
        }

        if !conditions.is_empty() {
            sql.push_str(&format!(" WHERE {}", conditions.join(" AND ")));
        }

        sql.push_str(" ORDER BY is_preferred DESC, name ASC");

        if let Some(l) = limit {
            sql.push_str(" LIMIT ?");
            param_values.push(l.to_string());
        }

        if let Some(o) = offset {
            sql.push_str(" OFFSET ?");
            param_values.push(o.to_string());
        }

        Ok(self
            .db
            .query_as::<Supplier>(&sql, rusqlite::params_from_iter(param_values))?)
    }

    /// Update supplier.
    pub fn update_supplier(
        &self,
        id: &str,
        request: CreateSupplierRequest,
        updated_by: Option<String>,
    ) -> MaterialResult<Supplier> {
        let mut supplier = self
            .get_supplier(id)?
            .ok_or_else(|| MaterialError::NotFound(format!("Supplier {} not found", id)))?;

        supplier.name = request.name;
        supplier.code = request.code;
        supplier.contact_person = request.contact_person;
        supplier.email = request.email;
        supplier.phone = request.phone;
        supplier.website = request.website;
        supplier.address_street = request.address_street;
        supplier.address_city = request.address_city;
        supplier.address_state = request.address_state;
        supplier.address_zip = request.address_zip;
        supplier.address_country = request.address_country;
        supplier.tax_id = request.tax_id;
        supplier.business_license = request.business_license;
        supplier.payment_terms = request.payment_terms;
        supplier.lead_time_days = request.lead_time_days.unwrap_or(supplier.lead_time_days);
        supplier.is_preferred = request.is_preferred.unwrap_or(supplier.is_preferred);
        supplier.quality_rating = request.quality_rating;
        supplier.delivery_rating = request.delivery_rating;
        supplier.on_time_delivery_rate = request.on_time_delivery_rate;
        supplier.notes = request.notes;
        supplier.special_instructions = request.special_instructions;
        supplier.updated_at = crate::shared::contracts::common::now();
        supplier.updated_by = updated_by;

        self.save_supplier(&supplier)?;
        Ok(supplier)
    }

    fn validate_create_supplier_request(
        &self,
        request: &CreateSupplierRequest,
    ) -> MaterialResult<()> {
        if request.name.is_empty() {
            return Err(MaterialError::Validation(
                "Supplier name is required".to_string(),
            ));
        }

        let count: i32 = self.db.query_single_value(
            "SELECT COUNT(*) FROM suppliers WHERE name = ? AND is_active = 1",
            params![request.name],
        )?;

        if count > 0 {
            return Err(MaterialError::Validation(format!(
                "Supplier '{}' already exists",
                request.name
            )));
        }

        Ok(())
    }

    fn save_supplier(&self, supplier: &Supplier) -> MaterialResult<()> {
        let exists: i32 = self.db.query_single_value(
            "SELECT COUNT(*) FROM suppliers WHERE id = ?",
            params![supplier.id],
        )?;

        if exists > 0 {
            self.db.execute(
                r#"
                UPDATE suppliers SET
                    name = ?, code = ?, contact_person = ?, email = ?, phone = ?, website = ?,
                    address_street = ?, address_city = ?, address_state = ?, address_zip = ?, address_country = ?,
                    tax_id = ?, business_license = ?, payment_terms = ?, lead_time_days = ?,
                    is_active = ?, is_preferred = ?, quality_rating = ?, delivery_rating = ?, on_time_delivery_rate = ?,
                    notes = ?, special_instructions = ?, updated_at = ?, updated_by = ?, synced = ?, last_synced_at = ?
                WHERE id = ?
                "#,
                params![
                    supplier.name,
                    supplier.code,
                    supplier.contact_person,
                    supplier.email,
                    supplier.phone,
                    supplier.website,
                    supplier.address_street,
                    supplier.address_city,
                    supplier.address_state,
                    supplier.address_zip,
                    supplier.address_country,
                    supplier.tax_id,
                    supplier.business_license,
                    supplier.payment_terms,
                    supplier.lead_time_days,
                    supplier.is_active,
                    supplier.is_preferred,
                    supplier.quality_rating,
                    supplier.delivery_rating,
                    supplier.on_time_delivery_rate,
                    supplier.notes,
                    supplier.special_instructions,
                    supplier.updated_at,
                    supplier.updated_by,
                    supplier.synced,
                    supplier.last_synced_at,
                    supplier.id,
                ],
            )?;
        } else {
            self.db.execute(
                r#"
                INSERT INTO suppliers (
                    id, name, code, contact_person, email, phone, website,
                    address_street, address_city, address_state, address_zip, address_country,
                    tax_id, business_license, payment_terms, lead_time_days,
                    is_active, is_preferred, quality_rating, delivery_rating, on_time_delivery_rate,
                    notes, special_instructions, created_at, updated_at, created_by, updated_by, synced, last_synced_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
                params![
                    supplier.id,
                    supplier.name,
                    supplier.code,
                    supplier.contact_person,
                    supplier.email,
                    supplier.phone,
                    supplier.website,
                    supplier.address_street,
                    supplier.address_city,
                    supplier.address_state,
                    supplier.address_zip,
                    supplier.address_country,
                    supplier.tax_id,
                    supplier.business_license,
                    supplier.payment_terms,
                    supplier.lead_time_days,
                    supplier.is_active,
                    supplier.is_preferred,
                    supplier.quality_rating,
                    supplier.delivery_rating,
                    supplier.on_time_delivery_rate,
                    supplier.notes,
                    supplier.special_instructions,
                    supplier.created_at,
                    supplier.updated_at,
                    supplier.created_by,
                    supplier.updated_by,
                    supplier.synced,
                    supplier.last_synced_at,
                ],
            )?;
        }

        Ok(())
    }
}
