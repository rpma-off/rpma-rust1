//! Unit tests for the `trash` domain.
//!
//! Test pure business logic — no I/O, no DB.
//! Naming: test_<function>_<scenario>_<expected_result>

#[cfg(test)]
mod tests {
    use crate::domains::trash::domain::models::trash::EntityType;

    // ── EntityType::table_name ──────────────────────────────────────────────

    #[test]
    fn test_entity_type_table_name_task_returns_tasks() {
        assert_eq!(EntityType::Task.table_name(), "tasks");
    }

    #[test]
    fn test_entity_type_table_name_client_returns_clients() {
        assert_eq!(EntityType::Client.table_name(), "clients");
    }

    #[test]
    fn test_entity_type_table_name_quote_returns_quotes() {
        assert_eq!(EntityType::Quote.table_name(), "quotes");
    }

    #[test]
    fn test_entity_type_table_name_material_returns_materials() {
        assert_eq!(EntityType::Material.table_name(), "materials");
    }

    #[test]
    fn test_entity_type_table_name_intervention_returns_interventions() {
        assert_eq!(EntityType::Intervention.table_name(), "interventions");
    }

    #[test]
    fn test_entity_type_table_name_photo_returns_photos() {
        assert_eq!(EntityType::Photo.table_name(), "photos");
    }

    #[test]
    fn test_entity_type_table_name_rapport_returns_intervention_reports() {
        assert_eq!(EntityType::Rapport.table_name(), "intervention_reports");
    }

    // ── EntityType::display_name_column ─────────────────────────────────────

    #[test]
    fn test_entity_type_display_column_task_returns_task_number() {
        assert_eq!(EntityType::Task.display_name_column(), "task_number");
    }

    #[test]
    fn test_entity_type_display_column_client_returns_name() {
        assert_eq!(EntityType::Client.display_name_column(), "name");
    }

    #[test]
    fn test_entity_type_display_column_quote_returns_quote_number() {
        assert_eq!(EntityType::Quote.display_name_column(), "quote_number");
    }

    #[test]
    fn test_entity_type_display_column_material_returns_name() {
        assert_eq!(EntityType::Material.display_name_column(), "name");
    }

    #[test]
    fn test_entity_type_display_column_intervention_returns_id() {
        assert_eq!(EntityType::Intervention.display_name_column(), "id");
    }

    #[test]
    fn test_entity_type_display_column_photo_returns_file_name() {
        assert_eq!(EntityType::Photo.display_name_column(), "file_name");
    }

    #[test]
    fn test_entity_type_display_column_rapport_returns_report_number() {
        assert_eq!(EntityType::Rapport.display_name_column(), "report_number");
    }

    // ── EntityType serde round-trip ─────────────────────────────────────────

    #[test]
    fn test_entity_type_serializes_to_json() {
        let json = serde_json::to_string(&EntityType::Task).unwrap();
        assert_eq!(json, "\"Task\"");
    }

    #[test]
    fn test_entity_type_deserializes_from_json() {
        let entity: EntityType = serde_json::from_str("\"Client\"").unwrap();
        assert_eq!(entity.table_name(), "clients");
    }

    #[test]
    fn test_entity_type_all_variants_roundtrip_serde() {
        let variants = vec![
            EntityType::Task,
            EntityType::Client,
            EntityType::Quote,
            EntityType::Material,
            EntityType::Intervention,
            EntityType::Photo,
            EntityType::Rapport,
        ];
        for variant in variants {
            let json = serde_json::to_string(&variant).unwrap();
            let deserialized: EntityType = serde_json::from_str(&json).unwrap();
            assert_eq!(
                variant.table_name(),
                deserialized.table_name(),
                "roundtrip failed for {:?}",
                variant
            );
        }
    }

    // ── DeletedItem ─────────────────────────────────────────────────────────

    #[test]
    fn test_deleted_item_serializes_correctly() {
        use crate::domains::trash::domain::models::trash::DeletedItem;

        let item = DeletedItem {
            id: "item-1".to_string(),
            entity_type: EntityType::Task,
            display_name: "TSK-001".to_string(),
            deleted_at: 1_700_000_000,
            deleted_by: Some("admin-1".to_string()),
            deleted_by_name: Some("Admin User".to_string()),
        };

        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("\"id\":\"item-1\""));
        assert!(json.contains("\"entity_type\":\"Task\""));
        assert!(json.contains("\"display_name\":\"TSK-001\""));
        assert!(json.contains("\"deleted_by\":\"admin-1\""));
    }

    #[test]
    fn test_deleted_item_optional_fields_serialize_as_null() {
        use crate::domains::trash::domain::models::trash::DeletedItem;

        let item = DeletedItem {
            id: "item-2".to_string(),
            entity_type: EntityType::Client,
            display_name: "Acme Corp".to_string(),
            deleted_at: 1_700_000_000,
            deleted_by: None,
            deleted_by_name: None,
        };

        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("\"deleted_by\":null"));
        assert!(json.contains("\"deleted_by_name\":null"));
    }

    // ── EntityType Debug ────────────────────────────────────────────────────

    #[test]
    fn test_entity_type_debug_format_is_readable() {
        let debug = format!("{:?}", EntityType::Task);
        assert_eq!(debug, "Task");
    }

    #[test]
    fn test_entity_type_clone_preserves_value() {
        let original = EntityType::Quote;
        let cloned = original.clone();
        assert_eq!(original.table_name(), cloned.table_name());
    }
}
