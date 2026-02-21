//! Application-layer contracts (DTOs) for the Clients bounded context.

use crate::commands::ClientAction;
use serde::Deserialize;

/// Client request structure
#[derive(Deserialize, Debug)]
pub struct ClientCrudRequest {
    pub action: ClientAction,
    pub session_token: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}
