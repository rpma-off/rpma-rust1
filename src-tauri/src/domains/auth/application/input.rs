use serde::Deserialize;

/// TODO: document
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SignupRequest {
    pub email: String,
    pub first_name: String,
    pub last_name: String,
    pub password: String,
    pub role: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}
