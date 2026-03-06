//! Username generation from first and last names.

impl super::AuthService {
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
}
