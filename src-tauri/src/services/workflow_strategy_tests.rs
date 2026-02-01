//! Simple test to verify the workflow strategy pattern works correctly

use crate::models::intervention::InterventionType;
use crate::services::workflow_strategy::{
    EnvironmentConditions, ExpressPPFStrategy, StandardPPFStrategy, WorkflowContext,
    WorkflowStrategyFactory,
};

#[test]
fn test_strategy_factory_standard_workflow() {
    // Create a standard intervention (more than 2 zones)
    let mut intervention = crate::models::intervention::Intervention::new(
        "task-123".to_string(),
        "TASK-001".to_string(),
        "ABC-123".to_string(),
    );
    intervention.intervention_type = InterventionType::Ppf;
    intervention.ppf_zones_config = Some(vec![
        "hood".to_string(),
        "fenders".to_string(),
        "mirrors".to_string(),
    ]);

    let context = WorkflowContext {
        intervention: intervention.clone(),
        user_id: "test-user".to_string(),
        environment_conditions: None,
    };

    // Factory should select standard strategy for multi-zone jobs
    let strategy = WorkflowStrategyFactory::create_strategy(&intervention, &context);

    assert_eq!(strategy.strategy_name(), "standard_ppf");

    let steps = strategy.get_workflow_steps(&context);
    assert_eq!(steps.len(), 4); // Standard has 4 steps
    assert_eq!(steps[0].name, "Inspection");
    assert_eq!(steps[1].name, "Préparation");
    assert_eq!(steps[2].name, "Installation");
    assert_eq!(steps[3].name, "Finalisation");
}

#[test]
fn test_strategy_factory_express_workflow() {
    // Create an express intervention (2 or fewer zones)
    let mut intervention = crate::models::intervention::Intervention::new(
        "task-456".to_string(),
        "TASK-002".to_string(),
        "XYZ-789".to_string(),
    );
    intervention.intervention_type = InterventionType::Ppf;
    intervention.ppf_zones_config = Some(vec!["hood".to_string()]);

    let context = WorkflowContext {
        intervention: intervention.clone(),
        user_id: "test-user".to_string(),
        environment_conditions: None,
    };

    // Factory should select express strategy for small jobs
    let strategy = WorkflowStrategyFactory::create_strategy(&intervention, &context);

    assert_eq!(strategy.strategy_name(), "express_ppf");

    let steps = strategy.get_workflow_steps(&context);
    assert_eq!(steps.len(), 3); // Express has 3 steps
    assert_eq!(steps[0].name, "Inspection");
    assert_eq!(steps[1].name, "Installation");
    assert_eq!(steps[2].name, "Finalisation");
}

#[test]
fn test_workflow_step_configuration() {
    let strategy = StandardPPFStrategy::new();
    let context = WorkflowContext {
        intervention: crate::models::intervention::Intervention::new(
            "task-789".to_string(),
            "TASK-003".to_string(),
            "DEF-456".to_string(),
        ),
        user_id: "test-user".to_string(),
        environment_conditions: None,
    };

    let steps = strategy.get_workflow_steps(&context);

    // Verify inspection step configuration
    assert_eq!(steps[0].min_photos_required, 4);
    assert_eq!(steps[0].estimated_duration_seconds, Some(900));
    assert!(steps[0].is_mandatory);

    // Verify installation step configuration
    assert_eq!(steps[2].min_photos_required, 6);
    assert_eq!(steps[2].estimated_duration_seconds, Some(3600));
    assert!(steps[2].is_mandatory);
}

#[test]
fn test_environment_aware_instructions() {
    let strategy = StandardPPFStrategy::new();

    // Test with low temperature
    let context_low_temp = WorkflowContext {
        intervention: crate::models::intervention::Intervention::new(
            "task-001".to_string(),
            "TASK-001".to_string(),
            "ABC-123".to_string(),
        ),
        user_id: "test-user".to_string(),
        environment_conditions: Some(EnvironmentConditions {
            weather_condition: "sunny".to_string(),
            temperature_celsius: Some(10.0),
            humidity_percentage: Some(50.0),
            work_location: "indoor".to_string(),
        }),
    };

    let instructions = strategy.get_special_instructions(&context_low_temp);
    assert!(instructions.is_some());
    assert!(instructions
        .unwrap()
        .iter()
        .any(|i| i.contains("Low temperature")));

    // Test with high humidity
    let context_high_humidity = WorkflowContext {
        intervention: crate::models::intervention::Intervention::new(
            "task-002".to_string(),
            "TASK-002".to_string(),
            "XYZ-789".to_string(),
        ),
        user_id: "test-user".to_string(),
        environment_conditions: Some(EnvironmentConditions {
            weather_condition: "sunny".to_string(),
            temperature_celsius: Some(22.0),
            humidity_percentage: Some(75.0),
            work_location: "indoor".to_string(),
        }),
    };

    let instructions = strategy.get_special_instructions(&context_high_humidity);
    assert!(instructions.is_some());
    assert!(instructions
        .unwrap()
        .iter()
        .any(|i| i.contains("High humidity")));

    // Test with ideal conditions
    let context_ideal = WorkflowContext {
        intervention: crate::models::intervention::Intervention::new(
            "task-003".to_string(),
            "TASK-003".to_string(),
            "DEF-456".to_string(),
        ),
        user_id: "test-user".to_string(),
        environment_conditions: Some(EnvironmentConditions {
            weather_condition: "sunny".to_string(),
            temperature_celsius: Some(22.0),
            humidity_percentage: Some(50.0),
            work_location: "indoor".to_string(),
        }),
    };

    let instructions = strategy.get_special_instructions(&context_ideal);
    assert!(instructions.is_none());
}

#[test]
fn test_strategy_by_name() {
    let standard = WorkflowStrategyFactory::get_strategy_by_name("standard_ppf");
    assert!(standard.is_some());
    assert_eq!(standard.unwrap().strategy_name(), "standard_ppf");

    let express = WorkflowStrategyFactory::get_strategy_by_name("express_ppf");
    assert!(express.is_some());
    assert_eq!(express.unwrap().strategy_name(), "express_ppf");

    let unknown = WorkflowStrategyFactory::get_strategy_by_name("unknown_workflow");
    assert!(unknown.is_none());
}

#[test]
fn test_available_strategies() {
    let strategies = WorkflowStrategyFactory::list_available_strategies();
    assert_eq!(strategies.len(), 2);
    assert!(strategies.contains(&"standard_ppf"));
    assert!(strategies.contains(&"express_ppf"));
}
