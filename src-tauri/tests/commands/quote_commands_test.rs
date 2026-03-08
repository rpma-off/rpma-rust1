use serde_json::json;

use crate::commands::AppResult;
use crate::domains::quotes::ipc::quote::{create_quote, QuoteCreateRequest};
use rpma_rust1::test_utils::{mock_app_handle, setup_test_db};

#[tokio::test]
async fn test_create_quote_unauthenticated_fails_with_auth_error() -> AppResult<()> {
    let app_handle = mock_app_handle();
    let db = setup_test_db();

    // Mount database state but NO session
    app_handle.manage(db.db());

    let req = QuoteCreateRequest {
        client_id: "client-123".to_string(),
        vehicle_info: None,
        items: vec![],
        notes: None,
        valid_until: None,
    };

    let result = create_quote(app_handle.clone(), req).await;

    // Must error with Authentication
    assert!(result.is_err());
    let err_msg = result.unwrap_err();
    assert!(
        err_msg.contains("Session not found")
            || err_msg.contains("Unauthorized")
            || err_msg.contains("auth"),
        "Expected auth error, got: {}",
        err_msg
    );

    Ok(())
}
