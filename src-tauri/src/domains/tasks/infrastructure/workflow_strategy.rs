//! Workflow Strategy Pattern Implementation
//!
//! This module defines the strategy pattern for different workflow types in the PPF intervention system.
//! It allows for flexible workflow definitions that can be selected at runtime based on the intervention type.

use crate::db::InterventionResult;
use crate::domains::interventions::domain::models::intervention::Intervention;
use crate::domains::interventions::domain::models::step::{InterventionStep, StepType};
use async_trait::async_trait;

/// Configuration for a single workflow step
#[derive(Debug, Clone)]
pub struct WorkflowStepConfig {
    pub name: String,
    pub step_type: StepType,
    pub requires_photos: bool,
    pub min_photos_required: i32,
    pub max_photos_allowed: i32,
    pub is_mandatory: bool,
    pub estimated_duration_seconds: Option<i32>,
    pub description: Option<String>,
    pub quality_checkpoints: Option<Vec<String>>,
}

/// Context information for workflow initialization
#[derive(Debug, Clone)]
pub struct WorkflowContext {
    pub intervention: Intervention,
    pub user_id: String,
    pub environment_conditions: Option<EnvironmentConditions>,
}

/// Environment conditions that might affect workflow
#[derive(Debug, Clone)]
pub struct EnvironmentConditions {
    pub weather_condition: String,
    pub temperature_celsius: Option<f64>,
    pub humidity_percentage: Option<f64>,
    pub work_location: String,
}

/// Result of workflow initialization
#[derive(Debug, Clone)]
pub struct WorkflowInitResult {
    pub steps: Vec<InterventionStep>,
    pub total_estimated_duration: i32,
    pub special_instructions: Option<Vec<String>>,
}

/// Trait defining the workflow strategy interface
#[async_trait]
pub trait WorkflowStrategy: Send + Sync {
    /// Get the strategy name/identifier
    fn strategy_name(&self) -> &'static str;

    /// Get strategy description
    fn description(&self) -> &'static str;

    /// Check if this strategy is applicable for the given intervention
    fn is_applicable(&self, _intervention: &Intervention, _context: &WorkflowContext) -> bool {
        // Default implementation - can be overridden
        true
    }

    /// Get the workflow steps configuration
    fn get_workflow_steps(&self, context: &WorkflowContext) -> Vec<WorkflowStepConfig>;

    /// Synchronous version of initialize_workflow for use in non-async contexts
    fn initialize_workflow_sync(
        &self,
        intervention: &Intervention,
        context: &WorkflowContext,
    ) -> InterventionResult<WorkflowInitResult> {
        let steps_config = self.get_workflow_steps(context);
        let mut steps = Vec::new();
        let mut total_duration = 0;

        for (i, config) in steps_config.iter().enumerate() {
            let step_number = (i + 1) as i32;

            let mut step = InterventionStep::new(
                intervention.id.clone(),
                step_number,
                config.name.clone(),
                config.step_type.clone(),
            );

            // Apply configuration
            step.requires_photos = config.requires_photos;
            step.min_photos_required = config.min_photos_required;
            step.max_photos_allowed = config.max_photos_allowed;
            step.is_mandatory = config.is_mandatory;
            step.estimated_duration_seconds = config.estimated_duration_seconds;
            step.description = config.description.clone();
            step.quality_checkpoints = config.quality_checkpoints.clone();

            // Add duration to total
            if let Some(duration) = config.estimated_duration_seconds {
                total_duration += duration;
            }

            steps.push(step);
        }

        Ok(WorkflowInitResult {
            steps,
            total_estimated_duration: total_duration,
            special_instructions: self.get_special_instructions(context),
        })
    }

    /// Get any special instructions for this workflow
    fn get_special_instructions(&self, _context: &WorkflowContext) -> Option<Vec<String>> {
        None
    }

    /// Validate that steps can be completed in current conditions
    fn validate_conditions(&self, context: &WorkflowContext) -> Result<(), Vec<String>> {
        let mut errors = Vec::new();

        if let Some(conditions) = &context.environment_conditions {
            // Check temperature constraints
            if let Some(temp) = conditions.temperature_celsius {
                if temp < 10.0 || temp > 35.0 {
                    errors.push("Temperature outside optimal range (10-35Ã‚Â°C)".to_string());
                }
            }

            // Check humidity constraints
            if let Some(humidity) = conditions.humidity_percentage {
                if humidity > 80.0 {
                    errors.push("Humidity too high for optimal application".to_string());
                }
            }

            // Check weather conditions
            match conditions.weather_condition.as_str() {
                "rain" | "snow" | "storm" => {
                    errors.push("Weather conditions not suitable for PPF application".to_string());
                }
                _ => {}
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

/// Standard PPF workflow strategy (4-step process)
#[derive(Debug)]
pub struct StandardPPFStrategy;

impl StandardPPFStrategy {
    pub fn new() -> Self {
        Self
    }
}

impl Default for StandardPPFStrategy {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl WorkflowStrategy for StandardPPFStrategy {
    fn strategy_name(&self) -> &'static str {
        "standard_ppf"
    }

    fn description(&self) -> &'static str {
        "Standard PPF application workflow with 4 steps: Inspection, Preparation, Installation, Finalization"
    }

    fn get_workflow_steps(&self, _context: &WorkflowContext) -> Vec<WorkflowStepConfig> {
        vec![
            WorkflowStepConfig {
                name: "Inspection".to_string(),
                step_type: StepType::Inspection,
                requires_photos: true,
                min_photos_required: 4,
                max_photos_allowed: 10,
                is_mandatory: true,
                estimated_duration_seconds: Some(900), // 15 minutes
                description: Some("Thorough vehicle inspection before PPF application".to_string()),
                quality_checkpoints: Some(vec![
                    "Surface cleanliness verified".to_string(),
                    "Existing damage documented".to_string(),
                    "Measurements taken".to_string(),
                ]),
            },
            WorkflowStepConfig {
                name: "PrÃƒÂ©paration".to_string(),
                step_type: StepType::Preparation,
                requires_photos: true,
                min_photos_required: 2,
                max_photos_allowed: 8,
                is_mandatory: true,
                estimated_duration_seconds: Some(1800), // 30 minutes
                description: Some("Surface preparation and film cutting".to_string()),
                quality_checkpoints: Some(vec![
                    "Vehicle cleaned and decontaminated".to_string(),
                    "Film patterns prepared".to_string(),
                    "Work area ready".to_string(),
                ]),
            },
            WorkflowStepConfig {
                name: "Installation".to_string(),
                step_type: StepType::Installation,
                requires_photos: true,
                min_photos_required: 6,
                max_photos_allowed: 15,
                is_mandatory: true,
                estimated_duration_seconds: Some(3600), // 60 minutes
                description: Some("PPF film installation process".to_string()),
                quality_checkpoints: Some(vec![
                    "Film applied without bubbles".to_string(),
                    "Edges properly sealed".to_string(),
                    "No contamination under film".to_string(),
                ]),
            },
            WorkflowStepConfig {
                name: "Finalisation".to_string(),

                step_type: StepType::Finalization,
                requires_photos: true,
                min_photos_required: 4,
                max_photos_allowed: 10,
                is_mandatory: true,
                estimated_duration_seconds: Some(900), // 15 minutes
                description: Some("Final inspection and quality control".to_string()),
                quality_checkpoints: Some(vec![
                    "Final quality inspection passed".to_string(),
                    "Customer walkthrough completed".to_string(),
                    "Documentation complete".to_string(),
                ]),
            },
        ]
    }

    fn get_special_instructions(&self, context: &WorkflowContext) -> Option<Vec<String>> {
        let mut instructions = Vec::new();

        // Add specific instructions based on conditions
        if let Some(conditions) = &context.environment_conditions {
            if conditions.temperature_celsius.unwrap_or(20.0) < 15.0 {
                instructions.push(
                    "Low temperature detected - allow extra time for film adhesion".to_string(),
                );
            }
            if conditions.humidity_percentage.unwrap_or(50.0) > 70.0 {
                instructions.push(
                    "High humidity - ensure proper ventilation and extended drying time"
                        .to_string(),
                );
            }
        }

        if !instructions.is_empty() {
            Some(instructions)
        } else {
            None
        }
    }
}

/// Express PPF workflow strategy (3-step process for smaller jobs)
#[derive(Debug)]
pub struct ExpressPPFStrategy;

impl ExpressPPFStrategy {
    pub fn new() -> Self {
        Self
    }
}

impl Default for ExpressPPFStrategy {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl WorkflowStrategy for ExpressPPFStrategy {
    fn strategy_name(&self) -> &'static str {
        "express_ppf"
    }

    fn description(&self) -> &'static str {
        "Express PPF application workflow with 3 steps: Inspection, Installation, Finalization"
    }

    fn is_applicable(&self, intervention: &Intervention, _context: &WorkflowContext) -> bool {
        // Express workflow for small zones only
        intervention
            .ppf_zones_config
            .as_ref()
            .map(|zones| zones.len() <= 2)
            .unwrap_or(false)
    }

    fn get_workflow_steps(&self, _context: &WorkflowContext) -> Vec<WorkflowStepConfig> {
        vec![
            WorkflowStepConfig {
                name: "Inspection".to_string(),
                step_type: StepType::Inspection,
                requires_photos: true,
                min_photos_required: 2,
                max_photos_allowed: 6,
                is_mandatory: true,
                estimated_duration_seconds: Some(300), // 5 minutes
                description: Some("Quick inspection for express PPF application".to_string()),
                quality_checkpoints: Some(vec![
                    "Target areas identified".to_string(),
                    "Surface cleanliness checked".to_string(),
                ]),
            },
            WorkflowStepConfig {
                name: "Installation".to_string(),
                step_type: StepType::Installation,
                requires_photos: true,
                min_photos_required: 4,
                max_photos_allowed: 10,
                is_mandatory: true,
                estimated_duration_seconds: Some(1800), // 30 minutes
                description: Some("Express PPF film installation".to_string()),
                quality_checkpoints: Some(vec![
                    "Film applied correctly".to_string(),
                    "Quality check passed".to_string(),
                ]),
            },
            WorkflowStepConfig {
                name: "Finalisation".to_string(),
                step_type: StepType::Finalization,
                requires_photos: true,
                min_photos_required: 2,
                max_photos_allowed: 6,
                is_mandatory: true,
                estimated_duration_seconds: Some(300), // 5 minutes
                description: Some("Express final quality check".to_string()),
                quality_checkpoints: Some(vec![
                    "Final inspection complete".to_string(),
                    "Customer approval obtained".to_string(),
                ]),
            },
        ]
    }
}

/// Factory for creating workflow strategies
#[derive(Debug)]
pub struct WorkflowStrategyFactory;

impl WorkflowStrategyFactory {
    /// Create the appropriate strategy based on intervention and context
    pub fn create_strategy(
        intervention: &Intervention,
        context: &WorkflowContext,
    ) -> Box<dyn WorkflowStrategy> {
        // Try strategies in order of preference
        let strategies: Vec<Box<dyn WorkflowStrategy>> = vec![
            Box::new(ExpressPPFStrategy::new()),
            Box::new(StandardPPFStrategy::new()),
        ];

        for strategy in strategies {
            if strategy.is_applicable(intervention, context) {
                return strategy;
            }
        }

        // Default to standard PPF strategy
        Box::new(StandardPPFStrategy::new())
    }

    /// Get strategy by name
    pub fn get_strategy_by_name(name: &str) -> Option<Box<dyn WorkflowStrategy>> {
        match name {
            "express_ppf" => Some(Box::new(ExpressPPFStrategy::new())),
            "standard_ppf" => Some(Box::new(StandardPPFStrategy::new())),
            _ => None,
        }
    }

    /// List all available strategies
    pub fn list_available_strategies() -> Vec<&'static str> {
        vec!["express_ppf", "standard_ppf"]
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domains::interventions::domain::models::intervention::{InterventionStatus, InterventionType};
    use crate::shared::contracts::common::*;

    fn create_test_intervention() -> Intervention {
        let mut intervention = Intervention::new(
            "task-123".to_string(),
            "TASK-001".to_string(),
            "ABC-123".to_string(),
        );
        intervention.intervention_type = InterventionType::Ppf;
        intervention.ppf_zones_config = Some(vec!["hood".to_string()]);
        intervention
    }

    fn create_test_context() -> WorkflowContext {
        WorkflowContext {
            intervention: create_test_intervention(),
            user_id: "user-123".to_string(),
            environment_conditions: Some(EnvironmentConditions {
                weather_condition: "sunny".to_string(),
                temperature_celsius: Some(22.0),
                humidity_percentage: Some(50.0),
                work_location: "indoor".to_string(),
            }),
        }
    }

    #[test]
    fn test_standard_ppf_strategy() {
        let strategy = StandardPPFStrategy::new();
        let context = create_test_context();

        assert_eq!(strategy.strategy_name(), "standard_ppf");

        let steps_config = strategy.get_workflow_steps(&context);
        assert_eq!(steps_config.len(), 4);

        let result = strategy
            .initialize_workflow_sync(&context.intervention, &context)
            .unwrap();
        assert_eq!(result.steps.len(), 4);
        assert_eq!(result.total_estimated_duration, 7200); // 2 hours total
    }

    #[test]
    fn test_express_ppf_strategy() {
        let strategy = ExpressPPFStrategy::new();
        let context = create_test_context();

        assert_eq!(strategy.strategy_name(), "express_ppf");

        let steps_config = strategy.get_workflow_steps(&context);
        assert_eq!(steps_config.len(), 3);

        let result = strategy
            .initialize_workflow_sync(&context.intervention, &context)
            .unwrap();
        assert_eq!(result.steps.len(), 3);
        assert_eq!(result.total_estimated_duration, 2400); // 40 minutes total
    }

    #[test]
    fn test_strategy_factory() {
        let intervention = create_test_intervention();
        let context = create_test_context();

        let strategy = WorkflowStrategyFactory::create_strategy(&intervention, &context);
        assert_eq!(strategy.strategy_name(), "express_ppf"); // Should pick express for small job
    }
}
