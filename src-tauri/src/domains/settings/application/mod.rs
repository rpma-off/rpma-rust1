// Application layer for the Settings bounded context.
//
// Re-exports the public IPC contracts for settings operations.

pub use crate::domains::settings::ipc::settings::preferences::{
    UpdateGeneralSettingsRequest, UpdateUserPreferencesRequest,
};
pub use crate::domains::settings::ipc::settings::profile::{
    ChangeUserPasswordRequest, DeleteUserAccountRequest, UpdateUserProfileRequest,
    UploadUserAvatarRequest,
};
pub use crate::domains::settings::ipc::settings::accessibility::UpdateUserAccessibilityRequest;
pub use crate::domains::settings::ipc::settings::notifications::{
    UpdateNotificationSettingsRequest, UpdateUserNotificationsRequest,
};
pub use crate::domains::settings::ipc::settings::security::{
    UpdateSecuritySettingsRequest, UpdateUserSecurityRequest,
};
pub use crate::domains::settings::ipc::settings::audit::UpdateDataConsentRequest;
