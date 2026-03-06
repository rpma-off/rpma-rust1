//! Account creation and signup processing.

use crate::domains::auth::application::SignupRequest;
use crate::domains::auth::domain::models::auth::{UserAccount, UserRole};
use rusqlite::params;
use tracing::{debug, error, info, instrument, warn};

impl super::AuthService {
    /// Create new user account
    #[instrument(skip(self, password), fields(email = %email, username = %username, role = ?role))]
    pub fn create_account(
        &self,
        email: &str,
        username: &str,
        first_name: &str,
        last_name: &str,
        role: UserRole,
        password: &str,
    ) -> Result<UserAccount, String> {
        debug!("Validating account creation data for email: {}", email);

        // Validate all input data
        let (
            validated_email,
            validated_username,
            validated_first_name,
            validated_last_name,
            validated_password,
            _,
        ) = self
            .validator
            .validate_signup_data(
                email,
                username,
                first_name,
                last_name,
                password,
                Some(&role.to_string()),
            )
            .map_err(|e| {
                warn!("Account validation failed for {}: {}", email, e);
                format!("Validation error: {}", e)
            })?;

        debug!(
            "Validation passed, creating account for username: {}",
            validated_username
        );

        let password_hash = self.hash_password(&validated_password).map_err(|e| {
            error!("Password hashing failed for {}: {}", email, e);
            format!("Failed to process password: {}", e)
        })?;

        let account = UserAccount::new(
            validated_email.clone(),
            validated_username.clone(),
            validated_first_name.clone(),
            validated_last_name.clone(),
            role.clone(),
            password_hash.clone(),
        );

        let conn = self.db.get_connection().map_err(|e| {
            error!("Database connection failed for account creation: {}", e);
            "Database connection failed".to_string()
        })?;

        debug!("Inserting user account into database");
        // Combine first_name and last_name into full_name for database storage
        let full_name = if account.last_name.is_empty() {
            account.first_name.clone()
        } else {
            format!("{} {}", account.first_name, account.last_name)
        };

        match conn.execute(
            "INSERT INTO users
              (id, email, username, password_hash, salt, first_name, last_name, full_name, role, phone, is_active, last_login_at, login_count, preferences, synced, last_synced_at, created_at, updated_at)
              VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
            params![
                account.id,
                account.email,
                account.username,
                account.password_hash,
                account.salt,
                account.first_name,
                account.last_name,
                full_name,
                role.to_string(),
                account.phone,
                account.is_active as i32,
                account.last_login,
                account.login_count,
                account.preferences,
                account.synced as i32,
                account.last_synced_at,
                account.created_at,
                account.updated_at,
            ],
        ) {
            Ok(_) => {
                info!("Account created successfully for {} with username {}", email, username);

                // Create default user settings for the new account
                if let Err(e) = self.create_default_user_settings(&account.id, &account.first_name, &account.email) {
                    error!("Failed to create default settings for user {}: {}", account.id, e);
                    // Don't fail the account creation, but log the error
                }

                Ok(account)
            }
            Err(e) => {
                let raw_error_message = e.to_string();
                let contains_user_settings = raw_error_message.contains("user_settings");
                let contains_no_column = raw_error_message.contains("no such column");
                let contains_no_table = raw_error_message.contains("no such table");

                match &e {
                    rusqlite::Error::SqliteFailure(sqlite_err, _) => {
                        error!(
                            email = %email,
                            error_code = ?sqlite_err.code,
                            extended_code = sqlite_err.extended_code,
                            contains_user_settings,
                            contains_no_column,
                            contains_no_table,
                            raw_error = %raw_error_message,
                            "Database error creating account"
                        );
                    }
                    _ => {
                        error!(
                            email = %email,
                            error_code = %"non_sqlite_failure",
                            extended_code = -1,
                            contains_user_settings,
                            contains_no_column,
                            contains_no_table,
                            raw_error = %raw_error_message,
                            "Database error creating account"
                        );
                    }
                }

                let error_msg = match e {
                    rusqlite::Error::SqliteFailure(sqlite_err, _) => {
                        if sqlite_err.code == rusqlite::ErrorCode::ConstraintViolation {
                            if raw_error_message.contains("email") {
                                "An account with this email already exists".to_string()
                            } else if raw_error_message.contains("username") {
                                "Username is already taken".to_string()
                            } else {
                                "Account creation failed due to constraint violation".to_string()
                            }
                        } else {
                            format!("Database constraint error: {}", raw_error_message)
                        }
                    }
                    _ => {
                        format!("Failed to create account: {}", raw_error_message)
                    }
                };
                Err(error_msg)
            }
        }
    }

    /// Create default user settings for a newly created user
    fn create_default_user_settings(
        &self,
        user_id: &str,
        first_name: &str,
        email: &str,
    ) -> Result<(), String> {
        debug!("Creating default user settings for user {}", user_id);

        let conn = self.db.get_connection().map_err(|e| {
            error!(
                "Failed to get database connection for user settings creation: {}",
                e
            );
            format!("Database connection failed: {}", e)
        })?;

        // Check if settings already exist (shouldn't happen for new users, but let's be safe)
        let existing_count: Result<i32, _> = conn.query_row(
            "SELECT COUNT(*) FROM user_settings WHERE user_id = ?",
            params![user_id],
            |row| row.get(0),
        );

        match existing_count {
            Ok(count) if count > 0 => {
                warn!(
                    "User settings already exist for user {}, skipping creation",
                    user_id
                );
                return Ok(());
            }
            Ok(_) => {} // Continue with creation
            Err(e) => {
                error!(
                    "Failed to check existing user settings for {}: {}",
                    user_id, e
                );
                return Err(format!("Failed to check existing settings: {}", e));
            }
        }

        let settings_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();

        // Insert default settings with user's name and email
        match conn.execute(
            "INSERT INTO user_settings (
                id, user_id, full_name, email, phone, avatar_url, notes,
                email_notifications, push_notifications, task_assignments, task_updates,
                system_alerts, weekly_reports, theme, language, date_format, time_format,
                high_contrast, large_text, reduce_motion, screen_reader, auto_refresh, refresh_interval,
                two_factor_enabled, session_timeout,
                cache_enabled, cache_size, offline_mode, sync_on_startup, background_sync,
                image_compression, preload_data,
                accessibility_high_contrast, accessibility_large_text, accessibility_reduce_motion,
                accessibility_screen_reader, accessibility_focus_indicators, accessibility_keyboard_navigation,
                accessibility_text_to_speech, accessibility_speech_rate, accessibility_font_size,
                accessibility_color_blind_mode,
                notifications_email_enabled, notifications_push_enabled, notifications_in_app_enabled,
                notifications_task_assigned, notifications_task_updated, notifications_task_completed,
                notifications_task_overdue, notifications_system_alerts, notifications_maintenance,
                notifications_security_alerts, notifications_quiet_hours_enabled,
                notifications_quiet_hours_start, notifications_quiet_hours_end,
                notifications_digest_frequency, notifications_batch_notifications,
                notifications_sound_enabled, notifications_sound_volume,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                settings_id, user_id,
                first_name, email, None::<String>, None::<String>, None::<String>,  // profile
                1, 1, 1, 1, 1, 0, "system", "fr", "DD/MM/YYYY", "24h",  // preferences (notifications enabled, system theme)
                0, 0, 0, 0, 1, 60,  // accessibility and performance
                0, 480,  // security
                1, 100, 0, 1, 1, 1, 0,  // performance settings
                0, 0, 0, 0, 1, 1, 0, 1.0, 16, "none",  // accessibility
                1, 1, 1, 1, 1, 0, 1, 0, 1, 0, "22:00", "08:00", "never", 0, 1, 70,  // notifications
                now, now  // timestamps
            ],
        ) {
            Ok(_) => {
                info!("Successfully created default user settings for user {}", user_id);
                Ok(())
            }
            Err(e) => {
                error!("Failed to create default user settings for user {}: {}", user_id, e);
                Err(format!("Failed to create user settings: {}", e))
            }
        }
    }

    /// Create new user account from signup request (handles validation, role mapping, username generation)
    #[instrument(skip(self, request), fields(email = %request.email, first_name = %request.first_name, last_name = %request.last_name))]
    pub fn create_account_from_signup(
        &self,
        request: &SignupRequest,
    ) -> Result<UserAccount, String> {
        debug!("Processing signup request for email: {}", request.email);

        // Validate input
        if request.email.trim().is_empty() {
            return Err("Email is required".to_string());
        }
        if request.first_name.trim().is_empty() {
            return Err("First name is required".to_string());
        }
        if request.last_name.trim().is_empty() {
            return Err("Last name is required".to_string());
        }
        if request.password.trim().is_empty() {
            return Err("Password is required".to_string());
        }

        // New users always start with 'viewer' role - admin must approve
        let role = UserRole::Viewer;

        // Generate username
        let username = self
            .generate_username_from_names(&request.first_name, &request.last_name)
            .map_err(|e| format!("Failed to generate username: {}", e))?;

        debug!(
            "Generated username: {} for email: {}",
            username, request.email
        );

        // Create account
        self.create_account(
            &request.email,
            &username,
            &request.first_name,
            &request.last_name,
            role,
            &request.password,
        )
    }
}
