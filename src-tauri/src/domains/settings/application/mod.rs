//! Application layer for the Settings bounded context.

pub mod contracts;

pub use contracts::{
    apply_profile_updates, build_export_payload, normalize_profile_field,
    UpdateSecuritySettingsRequest, UpdateUserSecurityRequest,
};
