//! Tests for user command handlers.

use rpma_ppf_intervention::commands::user::{
    bootstrap_first_admin, has_admins, user_crud, BootstrapFirstAdminRequest, UserCrudRequest,
};

#[test]
fn test_user_command_symbols_exist() {
    let _ = user_crud;
    let _ = bootstrap_first_admin;
    let _ = has_admins;
}

#[test]
fn test_user_crud_request_structure() {
    let _request_type = std::any::type_name::<UserCrudRequest>();
}

#[test]
fn test_bootstrap_first_admin_request_structure() {
    let _request_type = std::any::type_name::<BootstrapFirstAdminRequest>();
}
