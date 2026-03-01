//! Local authentication service for secure session management

use crate::domains::auth::application::SignupRequest;
use crate::domains::auth::domain::models::auth::{UserAccount, UserRole, UserSession};
use crate::domains::auth::infrastructure::rate_limiter::RateLimiterService;
use crate::domains::auth::infrastructure::session_repository::SessionRepository;
use crate::shared::services::performance_monitor::PerformanceMonitorService;
use crate::shared::services::security_monitor::SecurityMonitorService;
use crate::shared::services::validation::ValidationService;
use rusqlite::params;

use argon2::password_hash::{rand_core::OsRng, PasswordHasher, SaltString};
use argon2::{Argon2, PasswordHash, PasswordVerifier};
use chrono::Utc;
use serde_json;
use sha2::{Digest, Sha256};
use std::sync::Arc;
use tracing::{debug, error, info, instrument, warn};

#[derive(Clone, Debug)]
pub struct AuthService {
    db: crate::db::Database,
    session_repository: SessionRepository,
    rate_limiter: Arc<RateLimiterService>,
    security_monitor: Arc<SecurityMonitorService>,
    performance_monitor: Arc<PerformanceMonitorService>,
    validator: ValidationService,
}

impl AuthService {
    /// Get a reference to the security monitor service
    pub fn security_monitor(&self) -> &Arc<SecurityMonitorService> {
        &self.security_monitor
    }

    pub fn new(db: crate::db::Database) -> Result<Self, String> {
        let db_arc = std::sync::Arc::new(db.clone());
        let session_repository = SessionRepository::new(db_arc);
        let rate_limiter = Arc::new(RateLimiterService::new(db.clone()));
        let security_monitor = Arc::new(SecurityMonitorService::new(db.clone()));
        let performance_monitor = Arc::new(PerformanceMonitorService::new(db.clone()));

        Ok(Self {
            db,
            session_repository,
            rate_limiter,
            security_monitor,
            performance_monitor,
            validator: ValidationService::new(),
        })
    }

    /// Initialize auth services
    pub fn init(&self) -> Result<(), String> {
        // Note: users and sessions tables are created by migrations

        // Initialize rate limiter
        self.rate_limiter.init()?;

        // Initialize security monitor
        self.security_monitor.init()?;

        // Initialize performance monitor
        self.performance_monitor.init()?;

        // Clean up expired sessions on startup
        if let Err(e) = self.cleanup_expired_sessions() {
            warn!("Failed to cleanup expired sessions on startup: {}", e);
        }

        Ok(())
    }

    /// Get access to the rate limiter service
    pub fn rate_limiter(&self) -> Arc<RateLimiterService> {
        self.rate_limiter.clone()
    }

    /// Generate username from first and last name
    /// Creates a username by combining normalized first and last names with underscores
    /// Handles accents, special characters, length requirements, and uniqueness
    pub fn generate_username_from_names(
        &self,
        first_name: &str,
        last_name: &str,
    ) -> Result<String, String> {
        // 1. Normalize names (remove accents, convert to lowercase)
        let normalized_first = self.normalize_name_for_username(first_name);
        let normalized_last = self.normalize_name_for_username(last_name);

        // 2. Combine with underscore
        let mut username = if normalized_first.is_empty() && normalized_last.is_empty() {
            return Err("At least one name must be provided".to_string());
        } else if normalized_first.is_empty() {
            normalized_last
        } else if normalized_last.is_empty() {
            normalized_first
        } else {
            format!("{}_{}", normalized_first, normalized_last)
        };

        // 3. Ensure length requirements
        if username.len() < 3 {
            username = format!("{}_user", username);
        }
        if username.len() > 50 {
            username = username.chars().take(47).collect::<String>() + "...";
        }

        // 4. Ensure uniqueness
        self.ensure_unique_username(username)
    }

    /// Normalize name for username generation
    fn normalize_name_for_username(&self, name: &str) -> String {
        name.to_lowercase()
            .chars()
            .map(|c| match c {
                ' ' | '-' | '\'' => '_',
                c if c.is_ascii_alphanumeric() => c,
                _ => '_',
            })
            .collect::<String>()
            .split('_')
            .filter(|s| !s.is_empty())
            .collect::<Vec<&str>>()
            .join("_")
    }

    /// Ensure username is unique by adding numbers if needed
    fn ensure_unique_username(&self, base_username: String) -> Result<String, String> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| format!("Failed to get database connection: {}", e))?;

        // Check if base username is available
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM users WHERE username = ?",
                [&base_username],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check username uniqueness: {}", e))?;

        if count == 0 {
            return Ok(base_username);
        }

        // Try with numbers
        for i in 1..1000 {
            let candidate = format!("{}_{}", base_username, i);
            let count: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM users WHERE username = ?",
                    [&candidate],
                    |row| row.get(0),
                )
                .map_err(|e| format!("Failed to check username uniqueness: {}", e))?;

            if count == 0 {
                return Ok(candidate);
            }
        }

        Err("Unable to generate unique username".to_string())
    }

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
                error!("Database error creating account for {}: {}", email, e);
                let error_msg = match e {
                    rusqlite::Error::SqliteFailure(sqlite_err, _) => {
                        if sqlite_err.code == rusqlite::ErrorCode::ConstraintViolation {
                            if e.to_string().contains("email") {
                                "An account with this email already exists".to_string()
                            } else if e.to_string().contains("username") {
                                "Username is already taken".to_string()
                            } else {
                                "Account creation failed due to constraint violation".to_string()
                            }
                        } else {
                            format!("Database constraint error: {}", e)
                        }
                    }
                    _ => {
                        format!("Failed to create account: {}", e)
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

    /// Authenticate user
    #[instrument(skip(self, password), fields(email = %email))]
    pub fn authenticate(
        &self,
        email: &str,
        password: &str,
        ip_address: Option<&str>,
    ) -> Result<UserSession, String> {
        debug!("Authentication attempt for user {}", email);

        // Validate input
        let (validated_email, validated_password) = self
            .validator
            .validate_login_data(email, password)
            .map_err(|e| {
                warn!("Login validation failed for {}: {}", email, e);
                format!("Validation error: {}", e)
            })?;

        // Check rate limiting for both email and IP
        if self.rate_limiter.is_locked_out(&validated_email)? {
            return Err(format!(
                "Account temporarily locked due to too many failed attempts. Try again in {}.",
                self.rate_limiter
                    .get_lockout_remaining_time(&validated_email)?
                    .map(|d| format!("{} minutes", d.num_minutes()))
                    .unwrap_or_else(|| "a few minutes".to_string())
            ));
        }

        // Also check IP-based rate limiting if IP is provided
        if let Some(ip) = ip_address {
            if self.rate_limiter.is_locked_out(ip)? {
                return Err(format!(
                    "IP address temporarily locked due to too many failed attempts. Try again in {}.",
                    self.rate_limiter
                        .get_lockout_remaining_time(ip)?
                        .map(|d| format!("{} minutes", d.num_minutes()))
                        .unwrap_or_else(|| "a few minutes".to_string())
                ));
            }
        }

        let conn = self.db.get_connection()?;

        let account = conn.query_row(
            "SELECT id, email, username, password_hash, salt, first_name, last_name, role, phone, is_active, last_login_at, login_count, preferences, synced, last_synced_at, created_at, updated_at
              FROM users WHERE email = ? AND is_active = 1",
            [&validated_email],
            |row| {
                let role_str: String = row.get(7)?;
                let role = match role_str.as_str() {
                    "admin" => UserRole::Admin,
                    "technician" => UserRole::Technician,
                    "supervisor" => UserRole::Supervisor,
                    "viewer" => UserRole::Viewer,
                    _ => UserRole::Viewer,
                };

                Ok(UserAccount {
                    id: row.get(0)?,
                    email: row.get(1)?,
                    username: row.get(2)?,
                    password_hash: row.get(3)?,
                    salt: row.get(4)?,
                    first_name: row.get(5)?,
                    last_name: row.get(6)?,
                    role,
                    phone: row.get(8)?,
                    is_active: row.get::<_, i32>(9)? != 0,
                    last_login: row.get(10)?,
                    login_count: row.get(11)?,
                    preferences: row.get(12)?,
                    synced: row.get::<_, i32>(13)? != 0,
                    last_synced_at: row.get(14)?,
                    created_at: row.get(15)?,
                    updated_at: row.get(16)?,
                })
            },
        ).map_err(|e| {
            match e {
                rusqlite::Error::QueryReturnedNoRows => {
                    warn!("User not found or inactive: {}", validated_email);
                    // Log security event for invalid email attempt
                    //                     // let _ = self.security_monitor.log_auth_failure(None, None, "user_not_found");
                    "Invalid email or password".to_string()
                },
                _ => {
                    error!("Database error during authentication for {}: {}", validated_email, e);
                    format!("Database error: {}", e)
                },
            }
        })?;

        // Verify password
        let password_valid = self.verify_password(&validated_password, &account.password_hash)?;
        if !password_valid {
            // Record failed attempt for both email and IP
            self.rate_limiter.record_failed_attempt(&validated_email)?;
            if let Some(ip) = ip_address {
                self.rate_limiter.record_failed_attempt(ip)?;
            }

            // Log security event
            let _ =
                self.security_monitor
                    .log_auth_failure(Some(&account.id), None, "invalid_password");

            warn!("Invalid password for user {}", validated_email);
            return Err("Invalid email or password".to_string());
        }

        // Clear failed attempts on successful authentication
        self.rate_limiter.clear_failed_attempts(&validated_email)?;
        if let Some(ip) = ip_address {
            self.rate_limiter.clear_failed_attempts(ip)?;
        }

        // Log successful authentication
        let _ = self.security_monitor.log_auth_success(&account.id, None);

        // Update last login
        conn.execute(
            "UPDATE users SET last_login_at = ?, login_count = login_count + 1, updated_at = ? WHERE id = ?",
            params![Utc::now().timestamp_millis(), Utc::now().timestamp_millis(), account.id],
        ).map_err(|e| {
            error!("Failed to update last login for {}: {}", validated_email, e);
            format!("Failed to update last login: {}", e)
        })?;

        // Create session with a UUID token
        let token = uuid::Uuid::new_v4().to_string();
        let session = UserSession::new(
            account.id,
            account.username,
            account.email,
            account.role,
            token,
            28800, // 8 hours
        );

        // Persist session
        self.session_repository
            .insert_session(&session)
            .map_err(|e| {
                error!("Failed to store session for {}: {}", validated_email, e);
                format!("Failed to create session: {}", e)
            })?;

        info!("User {} authenticated successfully", validated_email);
        Ok(session)
    }

    /// Validate session token — direct DB lookup, no JWT.
    #[instrument(skip(self, token), fields(token_hash = %format!("{:x}", Sha256::digest(token.as_bytes()))))]
    pub fn validate_session(&self, token: &str) -> Result<UserSession, String> {
        debug!("Session validation request");
        let now_ms = Utc::now().timestamp_millis();
        let mut session = self
            .session_repository
            .find_valid_session(token, now_ms)
            .map_err(|e| format!("Database error: {}", e))?
            .ok_or_else(|| "Invalid or expired session".to_string())?;

        // Update last activity
        self.session_repository
            .update_last_activity(token, now_ms)
            .map_err(|e| format!("Failed to update session activity: {}", e))?;

        session.update_activity();
        Ok(session)
    }

    /// Logout — delete session by UUID token.
    pub fn logout(&self, token: &str) -> Result<(), String> {
        self.session_repository
            .delete_session(token)
            .map_err(|e| format!("Failed to logout: {}", e))?;
        Ok(())
    }

    /// Hash password using Argon2
    fn hash_password(&self, password: &str) -> Result<String, String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();

        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| format!("Failed to hash password: {}", e))?
            .to_string();

        Ok(password_hash)
    }

    /// Verify password against hash
    pub fn verify_password(&self, password: &str, hash: &str) -> Result<bool, String> {
        let parsed_hash =
            PasswordHash::new(hash).map_err(|e| format!("Invalid password hash: {}", e))?;

        let argon2 = Argon2::default();
        let result = argon2.verify_password(password.as_bytes(), &parsed_hash);

        Ok(result.is_ok())
    }

    /// Verify a user's password by looking up the stored hash from the database.
    ///
    /// Returns `Ok(true)` if the password matches, `Ok(false)` if the password is invalid.
    /// Returns `Err` if the user is not found, inactive, or a database error occurs.
    pub fn verify_user_password(&self, user_id: &str, password: &str) -> Result<bool, String> {
        let conn = self.db.get_connection()?;
        let stored_hash: String = conn
            .query_row(
                "SELECT password_hash FROM users WHERE id = ? AND is_active = 1",
                [user_id],
                |row| row.get(0),
            )
            .map_err(|_| "User not found or inactive".to_string())?;

        self.verify_password(password, &stored_hash)
    }

    /// List all users with optional filters
    pub fn list_users(
        &self,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> Result<Vec<UserAccount>, String> {
        let conn = self.db.get_connection()?;
        let limit = limit.unwrap_or(50);
        let offset = offset.unwrap_or(0);

        let mut stmt = conn.prepare(
            "SELECT id, email, username, password_hash, salt, first_name, last_name, role, phone, is_active, last_login_at, login_count, preferences, synced, last_synced_at, created_at, updated_at
              FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?"
        ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let users = stmt
            .query_map(params![limit, offset], |row| {
                let role_str: String = row.get(7)?;
                let role = match role_str.as_str() {
                    "admin" => UserRole::Admin,
                    "technician" => UserRole::Technician,
                    "supervisor" => UserRole::Supervisor,
                    "viewer" => UserRole::Viewer,
                    _ => UserRole::Viewer,
                };

                Ok(UserAccount {
                    id: row.get(0)?,
                    email: row.get(1)?,
                    username: row.get(2)?,
                    password_hash: row.get(3)?,
                    salt: row.get(4)?,
                    first_name: row.get(5)?,
                    last_name: row.get(6)?,
                    role,
                    phone: row.get(8)?,
                    is_active: row.get::<_, i32>(9)? != 0,
                    last_login: row.get(10)?,
                    login_count: row.get(11)?,
                    preferences: row.get(12)?,
                    synced: row.get::<_, i32>(13)? != 0,
                    last_synced_at: row.get(14)?,
                    created_at: row.get(15)?,
                    updated_at: row.get(16)?,
                })
            })
            .map_err(|e| format!("Failed to query users: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect users: {}", e))?;

        Ok(users)
    }

    /// Get user by ID
    pub fn get_user(&self, user_id: &str) -> Result<Option<UserAccount>, String> {
        let conn = self.db.get_connection()?;

        let user = conn.query_row(
            "SELECT id, email, username, password_hash, salt, first_name, last_name, role, phone, is_active, last_login_at, login_count, preferences, synced, last_synced_at, created_at, updated_at
              FROM users WHERE id = ?",
            [user_id],
            |row| {
                let role_str: String = row.get(7)?;
                let role = match role_str.as_str() {
                    "admin" => UserRole::Admin,
                    "technician" => UserRole::Technician,
                    "supervisor" => UserRole::Supervisor,
                    "viewer" => UserRole::Viewer,
                    _ => UserRole::Viewer,
                };

                Ok(UserAccount {
                    id: row.get(0)?,
                    email: row.get(1)?,
                    username: row.get(2)?,
                    password_hash: row.get(3)?,
                    salt: row.get(4)?,
                    first_name: row.get(5)?,
                    last_name: row.get(6)?,
                    role,
                    phone: row.get(8)?,
                    is_active: row.get::<_, i32>(9)? != 0,
                    last_login: row.get(10)?,
                    login_count: row.get(11)?,
                    preferences: row.get(12)?,
                    synced: row.get::<_, i32>(13)? != 0,
                    last_synced_at: row.get(14)?,
                    created_at: row.get(15)?,
                    updated_at: row.get(16)?,
                })
            },
        );

        match user {
            Ok(user) => Ok(Some(user)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(format!("Database error: {}", e)),
        }
    }

    /// Update user account
    pub fn update_user(
        &self,
        user_id: &str,
        email: Option<&str>,
        first_name: Option<&str>,
        last_name: Option<&str>,
        role: Option<UserRole>,
        is_active: Option<bool>,
    ) -> Result<UserAccount, String> {
        let conn = self.db.get_connection()?;

        // Get current user
        let mut current_user = self
            .get_user(user_id)?
            .ok_or_else(|| "User not found".to_string())?;

        // Update fields
        if let Some(email) = email {
            current_user.email = email.to_string();
        }
        if let Some(first_name) = first_name {
            current_user.first_name = first_name.to_string();
        }
        if let Some(last_name) = last_name {
            current_user.last_name = last_name.to_string();
        }
        if let Some(role) = role {
            current_user.role = role;
        }
        if let Some(is_active) = is_active {
            current_user.is_active = is_active;
        }

        current_user.updated_at = Utc::now().timestamp_millis();

        // Update in database
        conn.execute(
            "UPDATE users SET email = ?, first_name = ?, last_name = ?, role = ?, phone = ?, is_active = ?, preferences = ?, synced = ?, last_synced_at = ?, updated_at = ? WHERE id = ?",
            params![
                current_user.email,
                current_user.first_name,
                current_user.last_name,
                current_user.role.to_string(),
                current_user.phone,
                current_user.is_active as i32,
                current_user.preferences,
                current_user.synced as i32,
                current_user.last_synced_at,
                current_user.updated_at,
                user_id,
            ],
        ).map_err(|e| format!("Failed to update user: {}", e))?;

        Ok(current_user)
    }

    /// Delete user (soft delete by setting inactive)
    pub fn delete_user(&self, user_id: &str) -> Result<(), String> {
        let conn = self.db.get_connection()?;

        conn.execute(
            "UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?",
            params![Utc::now().timestamp_millis(), user_id],
        )
        .map_err(|e| format!("Failed to delete user: {}", e))?;

        Ok(())
    }

    /// Change user password
    pub fn change_password(&self, user_id: &str, new_password: &str) -> Result<(), String> {
        let password_hash = self.hash_password(new_password)?;
        let conn = self.db.get_connection()?;

        conn.execute(
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
            params![password_hash, Utc::now().timestamp_millis(), user_id],
        )
        .map_err(|e| format!("Failed to change password: {}", e))?;

        Ok(())
    }

    /// Clean up expired sessions from database
    pub fn cleanup_expired_sessions(&self) -> Result<usize, String> {
        let now_ms = Utc::now().timestamp_millis();
        let deleted_count = self
            .session_repository
            .cleanup_expired(now_ms)
            .map_err(|e| format!("Failed to cleanup expired sessions: {}", e))?;

        if deleted_count > 0 {
            let mut details = std::collections::HashMap::new();
            details.insert(
                "sessions_cleaned".to_string(),
                serde_json::json!(deleted_count),
            );
            let _ = self
                .security_monitor
                .log_suspicious_activity(None, "session_cleanup", details);
        }

        Ok(deleted_count)
    }
}
