//! End-to-end backend integration tests for critical workflow flows.
//!
//! These tests exercise real IPC command handlers with full AppState wiring.

use crate::commands::{AppError, TaskAction, TaskResponse};
use crate::db::Database;
use crate::domains::auth::domain::models::auth::UserRole;
use crate::domains::auth::ipc::auth::{auth_login, LoginRequest};
use crate::domains::clients::domain::models::client::{CreateClientRequest, CustomerType};
use crate::domains::interventions::application::{
    FinalizeInterventionRequest, InterventionWorkflowAction, InterventionWorkflowResponse,
    StartInterventionRequest,
};
use crate::domains::interventions::ipc::intervention::queries::{
    intervention_progress, InterventionProgressAction,
};
use crate::domains::interventions::ipc::intervention::workflow::{
    intervention_finalize, intervention_workflow,
};
use crate::domains::quotes::application::{QuoteCreateRequest, QuoteStatusRequest};
use crate::domains::quotes::domain::models::quote::{
    CreateQuoteItemRequest, CreateQuoteRequest, QuoteItemKind,
};
use crate::domains::quotes::ipc::quote::{quote_create, quote_mark_accepted, quote_mark_sent};
use crate::domains::reports::ipc::reports::generation::pdf_generation::generate_intervention_pdf_report;
use crate::domains::tasks::domain::models::task::CreateTaskRequest;
use crate::domains::tasks::ipc::task::facade::{task_crud, TaskCrudRequest};
use crate::service_builder::ServiceBuilder;
use crate::shared::app_state::AppStateType;
use chrono::Utc;
use serde_json::json;
use std::sync::Arc;
use tauri::test::MockRuntime;
use tauri::Manager;
use uuid::Uuid;

async fn build_test_app() -> tauri::App<MockRuntime> {
    let base_dir = std::env::temp_dir().join(format!("rpma-backend-it-{}", Uuid::new_v4()));
    std::fs::create_dir_all(&base_dir).expect("create temp test directory");

    let app_data_dir = base_dir.join("app-data");
    std::fs::create_dir_all(&app_data_dir).expect("create app data dir");

    let db_path = base_dir.join("test.db");
    let db = Arc::new(
        Database::new(&db_path, "test_encryption_key_32_bytes_long!")
            .expect("create test database"),
    );
    db.init().expect("init test db");
    let latest = Database::get_latest_migration_version();
    db.migrate(latest).expect("migrate test db");

    let repositories =
        Arc::new(crate::shared::repositories::Repositories::new(db.clone(), 1000).await);
    let app_state = ServiceBuilder::new(db, repositories, app_data_dir)
        .build()
        .expect("build app state");

    let app = tauri::test::mock_app();
    assert!(app.manage(app_state), "AppState should be managed once");
    app
}

fn build_test_state(app: &tauri::App<MockRuntime>) -> tauri::State<'_, AppStateType> {
    app.state::<AppStateType>()
}

async fn create_user_and_login(
    state: tauri::State<'_, AppStateType>,
    role: UserRole,
    email: &str,
    password: &str,
) -> String {
    let username = email.replace(['@', '.'], "_");
    state
        .auth_service
        .create_account(email, &username, "Flow", "Tester", role, password)
        .expect("create test user");

    let login_response = auth_login(
        LoginRequest {
            email: email.to_string(),
            password: password.to_string(),
            correlation_id: Some(format!("login-{}", Uuid::new_v4())),
        },
        state,
        Some("127.0.0.1".to_string()),
    )
    .await
    .expect("login command should not return transport error");

    assert!(login_response.success, "login must succeed");
    login_response.data.expect("session payload").token
}

fn query_required<T, P>(db: &Database, sql: &str, params: P) -> T
where
    T: rusqlite::types::FromSql,
    P: rusqlite::Params,
{
    let conn = db.get_connection().expect("db connection");
    conn.query_row(sql, params, |row| row.get::<_, T>(0))
        .expect("query row")
}

async fn create_client(state: tauri::State<'_, AppStateType>, user_id: &str) -> String {
    let client = state
        .client_service
        .create_client(
            CreateClientRequest {
                name: "Flow Client".to_string(),
                email: Some(format!("client-{}@example.com", Uuid::new_v4())),
                phone: Some("+33102030405".to_string()),
                customer_type: CustomerType::Individual,
                address_street: Some("10 Test Street".to_string()),
                address_city: Some("Paris".to_string()),
                address_state: None,
                address_zip: Some("75001".to_string()),
                address_country: Some("FR".to_string()),
                tax_id: None,
                company_name: None,
                contact_person: None,
                notes: None,
                tags: None,
            },
            user_id,
        )
        .await
        .expect("create client");
    client.id
}

#[tokio::test]
async fn login_create_task_start_intervention_complete_workflow_generate_report_happy_path() {
    let app = build_test_app().await;
    let state = build_test_state(&app);
    let admin_token = create_user_and_login(
        state.clone(),
        UserRole::Admin,
        "admin-flow1@example.com",
        "SecurePass123!",
    )
    .await;

    let create_response = task_crud(
        TaskCrudRequest {
            action: TaskAction::Create {
                data: CreateTaskRequest {
                    vehicle_plate: "AA-123-AA".to_string(),
                    vehicle_model: "Model X".to_string(),
                    ppf_zones: vec!["hood".to_string(), "front_bumper".to_string()],
                    scheduled_date: "2030-01-01".to_string(),
                    external_id: None,
                    status: None,
                    technician_id: None,
                    start_time: None,
                    end_time: None,
                    checklist_completed: Some(false),
                    notes: Some("Flow 1 task".to_string()),
                    title: Some("Flow 1 Task".to_string()),
                    vehicle_make: Some("Tesla".to_string()),
                    vehicle_year: Some("2024".to_string()),
                    vin: None,
                    date_rdv: None,
                    heure_rdv: None,
                    lot_film: None,
                    customer_name: Some("Flow Customer".to_string()),
                    customer_email: Some("flow.customer@example.com".to_string()),
                    customer_phone: None,
                    customer_address: None,
                    custom_ppf_zones: None,
                    template_id: None,
                    workflow_id: None,
                    task_number: None,
                    creator_id: None,
                    created_by: None,
                    description: Some("Happy path integration task".to_string()),
                    priority: None,
                    client_id: None,
                    estimated_duration: Some(120),
                    tags: None,
                },
            },
            session_token: admin_token.clone(),
            correlation_id: Some("flow1-task-create".to_string()),
        },
        state.clone(),
    )
    .await
    .expect("task create command");

    assert!(create_response.success);
    let created_task = match create_response.data.expect("task response payload") {
        TaskResponse::Created(task) => task,
        other => panic!(
            "expected TaskResponse::Created, got {:?}",
            std::mem::discriminant(&other)
        ),
    };
    let task_id = created_task.id.clone();

    let start_response = intervention_workflow(
        InterventionWorkflowAction::Start {
            data: StartInterventionRequest {
                task_id: task_id.clone(),
                intervention_type: "ppf".to_string(),
                priority: "medium".to_string(),
                description: Some("Flow 1 intervention".to_string()),
                estimated_duration_minutes: Some(120),
                correlation_id: Some("flow1-int-start".to_string()),
            },
        },
        admin_token.clone(),
        Some("flow1-int-workflow".to_string()),
        state.clone(),
    )
    .await
    .expect("intervention start command");

    assert!(start_response.success);
    let (intervention_id, steps) = match start_response.data.expect("start response payload") {
        InterventionWorkflowResponse::Started {
            intervention,
            steps,
        } => (intervention.id, steps),
        other => panic!(
            "expected InterventionWorkflowResponse::Started, got {:?}",
            std::mem::discriminant(&other)
        ),
    };
    assert!(!steps.is_empty(), "workflow should create steps");

    for step in steps {
        let advance_response = intervention_progress(
            InterventionProgressAction::AdvanceStep {
                intervention_id: intervention_id.clone(),
                step_id: step.id,
                collected_data: json!({
                    "done": true,
                    "timestamp": Utc::now().to_rfc3339()
                }),
                photos: Some(vec!["photo-a".to_string(), "photo-b".to_string()]),
                notes: Some("step completed".to_string()),
                quality_check_passed: true,
                issues: None,
            },
            admin_token.clone(),
            Some("flow1-int-advance".to_string()),
            state.clone(),
        )
        .await
        .expect("advance step command");
        assert!(advance_response.success, "each step must advance");
    }

    let finalize_response = intervention_finalize(
        FinalizeInterventionRequest {
            intervention_id: intervention_id.clone(),
            collected_data: Some(json!({"finalized": true})),
            photos: Some(vec!["final-photo".to_string()]),
            customer_satisfaction: Some(5),
            quality_score: Some(5),
            final_observations: Some(vec!["All good".to_string()]),
            customer_signature: None,
            customer_comments: Some("Great job".to_string()),
            correlation_id: Some("flow1-int-finalize".to_string()),
        },
        admin_token.clone(),
        state.clone(),
    )
    .await
    .expect("finalize intervention command");
    assert!(finalize_response.success, "finalize should succeed");

    let custom_report_path = state
        .app_data_dir
        .join(format!("flow1-report-{}.pdf", intervention_id));
    let report_result = generate_intervention_pdf_report(
        intervention_id.clone(),
        Some(custom_report_path.to_string_lossy().to_string()),
        admin_token,
        Some("flow1-report".to_string()),
        state.clone(),
    )
    .await
    .expect("generate report command");

    assert!(report_result.success);
    let report_path = std::path::PathBuf::from(report_result.file_path.expect("report file path"));
    assert!(report_path.exists(), "report file should exist");
    let report_size = std::fs::metadata(&report_path)
        .expect("report metadata")
        .len();
    assert!(report_size > 0, "report file should not be empty");

    let db = state.db.as_ref();
    let task_status: String = query_required(
        db,
        "SELECT status FROM tasks WHERE id = ?1",
        rusqlite::params![task_id],
    );
    assert_eq!(task_status, "completed");

    let intervention_status: String = query_required(
        db,
        "SELECT status FROM interventions WHERE id = ?1",
        rusqlite::params![intervention_id],
    );
    assert_eq!(intervention_status, "completed");

    let completed_steps: i64 = query_required(
        db,
        "SELECT COUNT(*) FROM intervention_steps WHERE intervention_id = ?1 AND step_status = 'completed'",
        rusqlite::params![intervention_id],
    );
    assert!(completed_steps > 0, "completed steps should be persisted");
}

#[tokio::test]
async fn login_create_task_start_intervention_complete_workflow_permission_denied_for_viewer() {
    let app = build_test_app().await;
    let state = build_test_state(&app);
    let viewer_token = create_user_and_login(
        state.clone(),
        UserRole::Viewer,
        "viewer-flow1@example.com",
        "SecurePass123!",
    )
    .await;

    let result = task_crud(
        TaskCrudRequest {
            action: TaskAction::Create {
                data: CreateTaskRequest {
                    vehicle_plate: "BB-234-BB".to_string(),
                    vehicle_model: "Model Y".to_string(),
                    ppf_zones: vec!["hood".to_string()],
                    scheduled_date: "2030-01-02".to_string(),
                    external_id: None,
                    status: None,
                    technician_id: None,
                    start_time: None,
                    end_time: None,
                    checklist_completed: Some(false),
                    notes: None,
                    title: Some("Viewer task".to_string()),
                    vehicle_make: None,
                    vehicle_year: None,
                    vin: None,
                    date_rdv: None,
                    heure_rdv: None,
                    lot_film: None,
                    customer_name: None,
                    customer_email: None,
                    customer_phone: None,
                    customer_address: None,
                    custom_ppf_zones: None,
                    template_id: None,
                    workflow_id: None,
                    task_number: None,
                    creator_id: None,
                    created_by: None,
                    description: None,
                    priority: None,
                    client_id: None,
                    estimated_duration: None,
                    tags: None,
                },
            },
            session_token: viewer_token,
            correlation_id: Some("flow1-viewer-create".to_string()),
        },
        state.clone(),
    )
    .await;

    match result {
        Err(AppError::Authorization(msg)) => {
            assert!(msg.to_lowercase().contains("permissions"));
        }
        other => panic!("expected authorization error, got {:?}", other),
    }

    let task_count: i64 = query_required(
        state.db.as_ref(),
        "SELECT COUNT(*) FROM tasks",
        rusqlite::params![],
    );
    assert_eq!(task_count, 0);
}

#[tokio::test]
async fn login_create_task_start_intervention_complete_workflow_invalid_task_input_rejected() {
    let app = build_test_app().await;
    let state = build_test_state(&app);
    let admin_token = create_user_and_login(
        state.clone(),
        UserRole::Admin,
        "admin-invalid-flow1@example.com",
        "SecurePass123!",
    )
    .await;

    let result = task_crud(
        TaskCrudRequest {
            action: TaskAction::Create {
                data: CreateTaskRequest {
                    vehicle_plate: "".to_string(),
                    vehicle_model: "".to_string(),
                    ppf_zones: vec![],
                    scheduled_date: "".to_string(),
                    external_id: None,
                    status: None,
                    technician_id: None,
                    start_time: None,
                    end_time: None,
                    checklist_completed: Some(false),
                    notes: None,
                    title: Some("Invalid Flow Task".to_string()),
                    vehicle_make: None,
                    vehicle_year: None,
                    vin: None,
                    date_rdv: None,
                    heure_rdv: None,
                    lot_film: None,
                    customer_name: None,
                    customer_email: None,
                    customer_phone: None,
                    customer_address: None,
                    custom_ppf_zones: None,
                    template_id: None,
                    workflow_id: None,
                    task_number: None,
                    creator_id: None,
                    created_by: None,
                    description: None,
                    priority: None,
                    client_id: None,
                    estimated_duration: None,
                    tags: None,
                },
            },
            session_token: admin_token,
            correlation_id: Some("flow1-invalid-create".to_string()),
        },
        state.clone(),
    )
    .await;

    match result {
        Err(AppError::Validation(_)) => {}
        other => panic!("expected validation error, got {:?}", other),
    }

    let count_invalid: i64 = query_required(
        state.db.as_ref(),
        "SELECT COUNT(*) FROM tasks WHERE title = 'Invalid Flow Task'",
        rusqlite::params![],
    );
    assert_eq!(count_invalid, 0);
}

#[tokio::test]
async fn create_quote_accept_convert_to_task_happy_path() {
    let app = build_test_app().await;
    let state = build_test_state(&app);
    let admin_token = create_user_and_login(
        state.clone(),
        UserRole::Admin,
        "admin-flow2@example.com",
        "SecurePass123!",
    )
    .await;
    let admin_user_id = state
        .auth_service
        .validate_session(&admin_token)
        .expect("validate admin session")
        .user_id;
    let client_id = create_client(state.clone(), &admin_user_id).await;

    let create_quote_response = quote_create(
        QuoteCreateRequest {
            session_token: admin_token.clone(),
            data: CreateQuoteRequest {
                client_id: client_id.clone(),
                task_id: None,
                valid_until: None,
                notes: Some("Flow 2 quote".to_string()),
                terms: Some("Standard terms".to_string()),
                vehicle_plate: Some("CC-345-CC".to_string()),
                vehicle_make: Some("BMW".to_string()),
                vehicle_model: Some("M3".to_string()),
                vehicle_year: Some("2023".to_string()),
                vehicle_vin: None,
                items: vec![CreateQuoteItemRequest {
                    kind: QuoteItemKind::Service,
                    label: "PPF complete".to_string(),
                    description: Some("Full front protection".to_string()),
                    qty: 1.0,
                    unit_price: 150_000,
                    tax_rate: Some(20.0),
                    material_id: None,
                    position: Some(0),
                }],
            },
            correlation_id: Some("flow2-create-quote".to_string()),
        },
        state.clone(),
    )
    .await
    .expect("quote_create command");
    assert!(create_quote_response.success);
    let quote = create_quote_response.data.expect("quote payload");

    let sent_response = quote_mark_sent(
        QuoteStatusRequest {
            session_token: admin_token.clone(),
            id: quote.id.clone(),
            correlation_id: Some("flow2-quote-sent".to_string()),
        },
        state.clone(),
    )
    .await
    .expect("quote_mark_sent command");
    assert!(sent_response.success);

    let accepted_response = quote_mark_accepted(
        QuoteStatusRequest {
            session_token: admin_token.clone(),
            id: quote.id.clone(),
            correlation_id: Some("flow2-quote-accepted".to_string()),
        },
        state.clone(),
    )
    .await
    .expect("quote_mark_accepted command");
    assert!(accepted_response.success);
    let accepted_payload = accepted_response.data.expect("accept payload");
    let created_task_id = accepted_payload
        .task_created
        .as_ref()
        .expect("task should be created on accept")
        .task_id
        .clone();

    let db = state.db.as_ref();
    let quote_status: String = query_required(
        db,
        "SELECT status FROM quotes WHERE id = ?1",
        rusqlite::params![quote.id.clone()],
    );
    assert_eq!(quote_status, "accepted");

    let linked_task_id: Option<String> = query_required(
        db,
        "SELECT task_id FROM quotes WHERE id = ?1",
        rusqlite::params![quote.id.clone()],
    );
    assert_eq!(linked_task_id.as_deref(), Some(created_task_id.as_str()));

    let linked_task_count: i64 = query_required(
        db,
        "SELECT COUNT(*) FROM tasks WHERE id = ?1",
        rusqlite::params![created_task_id.clone()],
    );
    assert_eq!(linked_task_count, 1);

    let linked_task_title: String = query_required(
        db,
        "SELECT title FROM tasks WHERE id = ?1",
        rusqlite::params![created_task_id],
    );
    assert!(
        linked_task_title.to_lowercase().contains("devis")
            || linked_task_title.to_lowercase().contains("quote"),
        "task title should indicate quote conversion"
    );
}

#[tokio::test]
async fn create_quote_accept_convert_to_task_permission_denied_for_viewer() {
    let app = build_test_app().await;
    let state = build_test_state(&app);

    let admin_token = create_user_and_login(
        state.clone(),
        UserRole::Admin,
        "admin-flow2-perm@example.com",
        "SecurePass123!",
    )
    .await;
    let admin_user_id = state
        .auth_service
        .validate_session(&admin_token)
        .expect("validate admin session")
        .user_id;
    let client_id = create_client(state.clone(), &admin_user_id).await;

    let viewer_token = create_user_and_login(
        state.clone(),
        UserRole::Viewer,
        "viewer-flow2@example.com",
        "SecurePass123!",
    )
    .await;

    let result = quote_create(
        QuoteCreateRequest {
            session_token: viewer_token,
            data: CreateQuoteRequest {
                client_id,
                task_id: None,
                valid_until: None,
                notes: Some("Viewer quote attempt".to_string()),
                terms: None,
                vehicle_plate: None,
                vehicle_make: None,
                vehicle_model: None,
                vehicle_year: None,
                vehicle_vin: None,
                items: vec![CreateQuoteItemRequest {
                    kind: QuoteItemKind::Service,
                    label: "Unauthorized item".to_string(),
                    description: None,
                    qty: 1.0,
                    unit_price: 10_000,
                    tax_rate: Some(20.0),
                    material_id: None,
                    position: Some(0),
                }],
            },
            correlation_id: Some("flow2-viewer-create".to_string()),
        },
        state.clone(),
    )
    .await;

    match result {
        Err(AppError::Authorization(msg)) => {
            assert!(msg.to_lowercase().contains("viewer"));
        }
        other => panic!("expected authorization error, got {:?}", other),
    }
}

#[tokio::test]
async fn create_quote_accept_convert_to_task_invalid_input_rejected() {
    let app = build_test_app().await;
    let state = build_test_state(&app);
    let admin_token = create_user_and_login(
        state.clone(),
        UserRole::Admin,
        "admin-flow2-invalid@example.com",
        "SecurePass123!",
    )
    .await;

    let response = quote_create(
        QuoteCreateRequest {
            session_token: admin_token,
            data: CreateQuoteRequest {
                client_id: "".to_string(),
                task_id: None,
                valid_until: None,
                notes: Some("Invalid quote".to_string()),
                terms: None,
                vehicle_plate: None,
                vehicle_make: None,
                vehicle_model: None,
                vehicle_year: None,
                vehicle_vin: None,
                items: vec![CreateQuoteItemRequest {
                    kind: QuoteItemKind::Service,
                    label: "Invalid item".to_string(),
                    description: None,
                    qty: 0.0,
                    unit_price: 5_000,
                    tax_rate: Some(20.0),
                    material_id: None,
                    position: Some(0),
                }],
            },
            correlation_id: Some("flow2-invalid-create".to_string()),
        },
        state.clone(),
    )
    .await
    .expect("quote_create should return ApiResponse contract");

    assert!(!response.success, "invalid quote input should be rejected");
    assert!(response.error.is_some(), "error payload should be present");

    let quotes_count: i64 = query_required(
        state.db.as_ref(),
        "SELECT COUNT(*) FROM quotes",
        rusqlite::params![],
    );
    assert_eq!(quotes_count, 0);
}
