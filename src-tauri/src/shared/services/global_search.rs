use serde::{Deserialize, Serialize};
use ts_rs::TS;
use std::sync::Arc;
use tracing::{debug, error, info};

use crate::domains::clients::client_handler::IClientRepository;
use crate::shared::repositories::Repositories;
use crate::shared::context::RequestContext;

#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "lowercase")]
#[ts(export, export_to = "GlobalSearchResult.ts")]
pub enum GlobalSearchResult {
    Task {
        id: String,
        task_number: String,
        title: String,
        status: String
    },
    Client {
        id: String,
        name: String,
        email: Option<String>
    },
    Material {
        id: String,
        name: String,
        sku: String
    },
    Quote {
        id: String,
        quote_number: String,
        description: Option<String>
    },
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "GlobalSearchResponse.ts")]
pub struct GlobalSearchResponse {
    pub results: Vec<GlobalSearchResult>,
}

pub struct GlobalSearchService {
    repos: Arc<Repositories>,
}

impl GlobalSearchService {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub async fn search(&self, query: &str, _ctx: &RequestContext) -> Result<GlobalSearchResponse, String> {
        debug!("Performing global search for: {}", query);

        let mut results = Vec::new();
        let query_str = query.to_string();

        // 1. Search Tasks
        let task_query = crate::domains::tasks::domain::models::task::TaskQuery {
            search: Some(query_str.clone()),
            pagination: crate::shared::repositories::base::PaginationParams {
                page_size: Some(5),
                ..Default::default()
            },
            ..Default::default()
        };
        if let Ok(task_list) = self.repos.task.find_with_query(task_query).await {
            for task_with_details in task_list.data {
                let task = task_with_details.task;
                results.push(GlobalSearchResult::Task {
                    id: task.id,
                    task_number: task.task_number,
                    title: task.title,
                    status: task.status.to_string(),
                });
            }
        }

        // 2. Search Clients
        let client_repo_query = crate::domains::clients::client_handler::ClientRepoQuery {
            search: Some(query_str.clone()),
            limit: Some(5),
            ..Default::default()
        };
        if let Ok(clients) = self.repos.client.search(client_repo_query).await {
            for client in clients {
                results.push(GlobalSearchResult::Client {
                    id: client.id,
                    name: client.name,
                    email: client.email,
                });
            }
        }

        // 3. Search Materials
        let material_query = crate::domains::inventory::infrastructure::material_repository::MaterialQuery {
            search: Some(query_str.clone()),
            pagination: crate::shared::repositories::base::PaginationParams {
                page_size: Some(5),
                ..Default::default()
            },
            ..Default::default()
        };
        if let Ok(materials) = self.repos.material.search(material_query).await {
            for material in materials {
                results.push(GlobalSearchResult::Material {
                    id: material.id,
                    name: material.name,
                    sku: material.sku,
                });
            }
        }

        // 4. Search Quotes
        let quote_query = crate::domains::quotes::domain::models::quote::QuoteQuery {
            search: Some(query_str.clone()),
            pagination: crate::shared::repositories::base::PaginationParams {
                page_size: Some(5),
                ..Default::default()
            },
            ..Default::default()
        };
        if let Ok((quotes, _)) = self.repos.quote.list(&quote_query) {
            for quote in quotes {
                results.push(GlobalSearchResult::Quote {
                    id: quote.id,
                    quote_number: quote.quote_number,
                    description: quote.description,
                });
            }
        }

        Ok(GlobalSearchResponse { results })
    }
}
