use serde::Deserialize;

#[derive(Clone, Debug, Deserialize)]
pub struct SignupRequest {
    pub email: String,
    pub first_name: String,
    pub last_name: String,
    pub password: String,
    pub role: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}
