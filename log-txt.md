﻿
emaMA@LAPTOP-76DN517M MINGW64 /d/rpma-rust (new-infr)
$ npm run dev

> rpma-rust@0.1.0 dev
> npm run types:sync && set JWT_SECRET=dfc3d7f5c295d19b42e9b3d7eaa9602e45f91a9e5e95cbaa3230fc17e631c74b && npm run tauri dev


> rpma-rust@0.1.0 types:sync
> cd src-tauri && cargo run --bin export-types --features="ts-rs" | node ../scripts/write-types.js

   Compiling rpma-ppf-intervention v0.1.0 (D:\rpma-rust\src-tauri)
warning: unused import: `rusqlite::Connection`
 --> src-tauri\src\db\operation_pool.rs:8:5
  |
8 | use rusqlite::Connection;
  |     ^^^^^^^^^^^^^^^^^^^^
  |
  = note: `#[warn(unused_imports)]` on by default

warning: unused import: `std::sync::Arc`
 --> src-tauri\src\db\operation_pool.rs:9:5
  |
9 | use std::sync::Arc;
  |     ^^^^^^^^^^^^^^

warning: unused import: `warn`
  --> src-tauri\src\db\operation_pool.rs:11:28
   |
11 | use tracing::{debug, info, warn};
   |                            ^^^^

warning: unused import: `crate::repositories::base::PaginatedResult`
  --> src-tauri\src\repositories\task_repository.rs:10:5
   |
10 | use crate::repositories::base::PaginatedResult;
   |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

warning: unused import: `StreamingQuery`
 --> src-tauri\src\repositories\task_repository_streaming.rs:6:43
  |
6 | use crate::db::connection::{ChunkedQuery, StreamingQuery};
  |                                           ^^^^^^^^^^^^^^

warning: unused import: `rusqlite::params`
 --> src-tauri\src\repositories\task_repository_streaming.rs:9:5
  |
9 | use rusqlite::params;
  |     ^^^^^^^^^^^^^^^^

warning: unused import: `LogDomain`
 --> src-tauri\src\services\workflow_progression.rs:8:22
  |
8 | use crate::logging::{LogDomain, RPMARequestLogger};
  |                      ^^^^^^^^^

warning: unused import: `LogDomain`
 --> src-tauri\src\services\workflow_validation.rs:7:22
  |
7 | use crate::logging::{LogDomain, RPMARequestLogger};
  |                      ^^^^^^^^^

warning: unused import: `tokio::fs`
  --> src-tauri\src\services\pdf_generation.rs:16:5
   |
16 | use tokio::fs;
   |     ^^^^^^^^^

warning: unused import: `TaskWithClientListResponse`
 --> src-tauri\src\services\task_import.rs:9:48
  |
9 | use crate::services::task_client_integration::{TaskWithClientListResponse, TaskClientIntegrationService};
  |                                                ^^^^^^^^^^^^^^^^^^^^^^^^^^

warning: unused imports: `error` and `warn`
  --> src-tauri\src\services\task_import.rs:11:22
   |
11 | use tracing::{debug, error, info, warn};
   |                      ^^^^^        ^^^^

warning: unused import: `warn`
  --> src-tauri\src\services\task_update.rs:12:22
   |
12 | use tracing::{error, warn};
   |                      ^^^^

warning: unused imports: `error`, `info`, and `warn`
  --> src-tauri\src\services\websocket_event_handler.rs:10:22
   |
10 | use tracing::{debug, error, info, warn};
   |                      ^^^^^  ^^^^  ^^^^

warning: unused variable: `successful`
   --> src-tauri\src\commands\task\facade.rs:213:13
    |
213 |     let mut successful = 0u32;
    |             ^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_successful`
    |
    = note: `#[warn(unused_variables)]` on by default

warning: unused variable: `failed`
   --> src-tauri\src\commands\task\facade.rs:214:13
    |
214 |     let mut failed = 0u32;
    |             ^^^^^^ help: if this is intentional, prefix it with an underscore: `_failed`

warning: variable does not need to be mutable
   --> src-tauri\src\commands\task\facade.rs:213:9
    |
213 |     let mut successful = 0u32;
    |         ----^^^^^^^^^^
    |         |
    |         help: remove this `mut`
    |
    = note: `#[warn(unused_mut)]` on by default

warning: variable does not need to be mutable
   --> src-tauri\src\commands\task\facade.rs:214:9
    |
214 |     let mut failed = 0u32;
    |         ----^^^^^^
    |         |
    |         help: remove this `mut`

warning: variable does not need to be mutable
   --> src-tauri\src\commands\task\facade.rs:215:9
    |
215 |     let mut errors = import_result.errors.clone();
    |         ----^^^^^^
    |         |
    |         help: remove this `mut`

warning: unreachable expression
  --> src-tauri\src\repositories\task_repository_streaming.rs:88:13
   |
88 |             |row| Task::from_row(row),
   |             ^^^^^^^^^^^^^^^^^^^^^^^^^ unreachable expression
...
91 |             unimplemented!("Streaming requires pool integration"),
   |             ----------------------------------------------------- any code following this expression is unreachable
   |
   = note: `#[warn(unreachable_code)]` on by default

warning: unused variable: `conn`
  --> src-tauri\src\repositories\task_repository_streaming.rs:82:13
   |
82 |         let conn = self.pool_manager.get_connection(OperationType::Read)?;
   |             ^^^^ help: if this is intentional, prefix it with an underscore: `_conn`

warning: unused variable: `query`
  --> src-tauri\src\repositories\task_repository_streaming.rs:85:13
   |
85 |         let query = ChunkedQuery::new(
   |             ^^^^^ help: if this is intentional, prefix it with an underscore: `_query`

warning: unused variable: `chunk_size`
  --> src-tauri\src\repositories\task_repository_streaming.rs:32:9
   |
32 |         chunk_size: usize,
   |         ^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_chunk_size`

warning: unused variable: `create_request`
   --> src-tauri\src\services\task_import.rs:147:17
    |
147 |             let create_request = CreateTaskRequest {
    |                 ^^^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_create_request`

warning: unused variable: `quality`
   --> src-tauri\src\services\photo\processing.rs:172:9
    |
172 |         quality: u8,
    |         ^^^^^^^ help: if this is intentional, prefix it with an underscore: `_quality`

warning: unused variable: `vehicle_make`
   --> src-tauri\src\services\task_update.rs:145:21
    |
145 |         if let Some(vehicle_make) = &req.vehicle_make {
    |                     ^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_vehicle_make`

warning: unused variable: `vin`
   --> src-tauri\src\services\task_update.rs:149:21
    |
149 |         if let Some(vin) = &req.vin {
    |                     ^^^ help: if this is intentional, prefix it with an underscore: `_vin`

warning: unused variable: `client_id`
   --> src-tauri\src\services\task_update.rs:153:21
    |
153 |         if let Some(client_id) = &req.client_id {
    |                     ^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_client_id`

warning: unused variable: `scheduled_date`
   --> src-tauri\src\services\task_update.rs:157:21
    |
157 |         if let Some(scheduled_date) = &req.scheduled_date {
    |                     ^^^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_scheduled_date`

warning: unused variable: `estimated_duration`
   --> src-tauri\src\services\task_update.rs:161:21
    |
161 |         if let Some(estimated_duration) = req.estimated_duration {
    |                     ^^^^^^^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_estimated_duration`

warning: unused variable: `notes`
   --> src-tauri\src\services\task_update.rs:165:21
    |
165 |         if let Some(notes) = &req.notes {
    |                     ^^^^^ help: if this is intentional, prefix it with an underscore: `_notes`

warning: fields `conn` and `operation_type` are never read
   --> src-tauri\src\db\operation_pool.rs:209:5
    |
208 | pub struct RoutedConnection {
    |            ---------------- fields in this struct
209 |     conn: PooledConnection<SqliteConnectionManager>,
    |     ^^^^
210 |     operation_type: OperationType,
    |     ^^^^^^^^^^^^^^
    |
    = note: `#[warn(dead_code)]` on by default

warning: field `db` is never read
  --> src-tauri\src\services\workflow_progression.rs:21:5
   |
20 | pub struct WorkflowProgressionService {
   |            -------------------------- field in this struct
21 |     db: Arc<Database>,
   |     ^^
   |
   = note: `WorkflowProgressionService` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

warning: field `db` is never read
  --> src-tauri\src\services\workflow_validation.rs:18:5
   |
17 | pub struct WorkflowValidationService {
   |            ------------------------- field in this struct
18 |     db: Arc<Database>,
   |     ^^
   |
   = note: `WorkflowValidationService` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

warning: methods `read_photo_file`, `read_photo_file_with_path`, and `delete_photo_file` are never used
   --> src-tauri\src\services\photo\storage.rs:221:18
    |
 51 | impl PhotoStorageService {
    | ------------------------ methods in this implementation
...
221 |     pub async fn read_photo_file(
    |                  ^^^^^^^^^^^^^^^
...
239 |     pub async fn read_photo_file_with_path(
    |                  ^^^^^^^^^^^^^^^^^^^^^^^^^
...
254 |     pub async fn delete_photo_file(
    |                  ^^^^^^^^^^^^^^^^^

warning: associated items `with_settings`, `compress_to_webp`, and `compress_to_webp_blocking` are never used
   --> src-tauri\src\services\photo\processing.rs:35:12
    |
 24 | impl PhotoProcessingService {
    | --------------------------- associated items in this implementation
...
 35 |     pub fn with_settings(jpeg_quality: u8, max_file_size: usize) -> Self {
    |            ^^^^^^^^^^^^^
...
141 |     pub async fn compress_to_webp(&self, data: Vec<u8>) -> crate::services::photo::PhotoResult<Vec<u8>> {
    |                  ^^^^^^^^^^^^^^^^
...
170 |     fn compress_to_webp_blocking(
    |        ^^^^^^^^^^^^^^^^^^^^^^^^^

warning: field `db` is never read
  --> src-tauri\src\services\task_import.rs:16:5
   |
15 | pub struct TaskImportService {
   |            ----------------- field in this struct
16 |     db: Arc<Database>,
   |     ^^
   |
   = note: `TaskImportService` has derived impls for the traits `Debug` and `Clone`, but these are intentionally ignored during dead code analysis

warning: field `settings` is never read
  --> src-tauri\src\services\task_validation.rs:16:5
   |
14 | pub struct TaskValidationService {
   |            --------------------- field in this struct
15 |     db: Arc<Database>,
16 |     settings: SettingsService,
   |     ^^^^^^^^
   |
   = note: `TaskValidationService` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

warning: method `get_max_tasks_per_user` is never used
  --> src-tauri\src\services\task_validation.rs:27:8
   |
19 | impl TaskValidationService {
   | -------------------------- method in this implementation
...
27 |     fn get_max_tasks_per_user(&self) -> Result<i32, String> {
   |        ^^^^^^^^^^^^^^^^^^^^^^

warning: use of `async fn` in public traits is discouraged as auto trait bounds cannot be specified
   --> src-tauri\src\services\websocket_event_handler.rs:261:5
    |
261 |     async fn broadcast_event(&self, event: &DomainEvent) -> Result<(), String>;
    |     ^^^^^
    |
    = note: you can suppress this lint if you plan to use the trait only in your own code, or do not care about auto traits like `Send` on the `Future`
    = note: `#[warn(async_fn_in_trait)]` on by default
help: you can alternatively desugar to a normal `fn` that returns `impl Future` and add any desired bounds such as `Send`, but these cannot be relaxed without a breaking API change
    |
261 -     async fn broadcast_event(&self, event: &DomainEvent) -> Result<(), String>;
261 +     fn broadcast_event(&self, event: &DomainEvent) -> impl std::future::Future<Output = Result<(), String>> + Send;
    |

warning: `rpma-ppf-intervention` (lib) generated 39 warnings (run `cargo fix --lib -p rpma-ppf-intervention` to apply 16 suggestions)
warning: unused imports: `EmailConfig`, `ParticipantStatus`, and `SmsConfig`
  --> src-tauri\src\bin\export-types.rs:14:69
   |
14 |         CreateEventInput, EventParticipant, EventStatus, EventType, ParticipantStatus,
   |                                                                     ^^^^^^^^^^^^^^^^^
...
30 |         EmailConfig, NotificationConfig, NotificationType, SmsConfig, TemplateVariables,
   |         ^^^^^^^^^^^                                        ^^^^^^^^^
   |
   = note: `#[warn(unused_imports)]` on by default

warning: `rpma-ppf-intervention` (bin "export-types") generated 1 warning (run `cargo fix --bin "export-types"` to apply 1 suggestion)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 45.43s
     Running `target\debug\export-types.exe`
✅ Successfully exported Rust types to TypeScript at ../frontend/src/lib/backend.ts
✅ Successfully exported Rust types to TypeScript at D:\rpma-rust\frontend\src\lib\backend.ts
✅ Validated exports: TaskStatus, TaskPriority, UserAccount

> rpma-rust@0.1.0 tauri
> tauri dev

     Running BeforeDevCommand (`cd frontend && npm run dev:next`)

> rpma-frontend@0.1.0 dev:next
> next dev

     Running DevCommand (`cargo  run --no-default-features --color always --`)
        Info Watching D:\rpma-rust\src-tauri for changes...
  ▲ Next.js 14.2.33
  - Local:        http://localhost:3000

 ✓ Starting...
        Info Watching D:\rpma-rust\src-tauri for changes...
   Compiling rpma-ppf-intervention v0.1.0 (D:\rpma-rust\src-tauri)
 ✓ Ready in 2.9s=====================> ] 710/712: rpma-...
warning: unused import: `rusqlite::Connection`
 --> src-tauri\src\db\operation_pool.rs:8:5
  |
8 | use rusqlite::Connection;
  |     ^^^^^^^^^^^^^^^^^^^^
  |
  = note: `#[warn(unused_imports)]` on by default

warning: unused import: `std::sync::Arc`
 --> src-tauri\src\db\operation_pool.rs:9:5
  |
9 | use std::sync::Arc;
  |     ^^^^^^^^^^^^^^

warning: unused import: `warn`
  --> src-tauri\src\db\operation_pool.rs:11:28
   |
11 | use tracing::{debug, info, warn};
   |                            ^^^^

warning: unused import: `crate::repositories::base::PaginatedResult`
  --> src-tauri\src\repositories\task_repository.rs:10:5
   |
10 | use crate::repositories::base::PaginatedResult;
   |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

warning: unused import: `StreamingQuery`
 --> src-tauri\src\repositories\task_repository_streaming.rs:6:43
  |
6 | use crate::db::connection::{ChunkedQuery, StreamingQuery};
  |                                           ^^^^^^^^^^^^^^

warning: unused import: `rusqlite::params`
 --> src-tauri\src\repositories\task_repository_streaming.rs:9:5
  |
9 | use rusqlite::params;
  |     ^^^^^^^^^^^^^^^^

warning: unused import: `LogDomain`
 --> src-tauri\src\services\workflow_progression.rs:8:22
  |
8 | use crate::logging::{LogDomain, RPMARequestLogger};
  |                      ^^^^^^^^^

warning: unused import: `LogDomain`
 --> src-tauri\src\services\workflow_validation.rs:7:22
  |
7 | use crate::logging::{LogDomain, RPMARequestLogger};
  |                      ^^^^^^^^^

warning: unused import: `tokio::fs`
  --> src-tauri\src\services\pdf_generation.rs:16:5
   |
16 | use tokio::fs;
   |     ^^^^^^^^^

warning: unused import: `TaskWithClientListResponse`
 --> src-tauri\src\services\task_import.rs:9:48
  |
9 | use crate::services::task_client_integration::{TaskWithClientListResponse, TaskClientIntegrationService};
  |                                                ^^^^^^^^^^^^^^^^^^^^^^^^^^

warning: unused imports: `error` and `warn`
  --> src-tauri\src\services\task_import.rs:11:22
   |
11 | use tracing::{debug, error, info, warn};
   |                      ^^^^^        ^^^^

warning: unused import: `warn`
  --> src-tauri\src\services\task_update.rs:12:22
   |
12 | use tracing::{error, warn};
   |                      ^^^^

warning: unused imports: `error`, `info`, and `warn`
  --> src-tauri\src\services\websocket_event_handler.rs:10:22
   |
10 | use tracing::{debug, error, info, warn};
   |                      ^^^^^  ^^^^  ^^^^

warning: unused variable: `successful`
   --> src-tauri\src\commands\task\facade.rs:213:13
    |
213 |     let mut successful = 0u32;
    |             ^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_successful`
    |
    = note: `#[warn(unused_variables)]` on by default

warning: unused variable: `failed`
   --> src-tauri\src\commands\task\facade.rs:214:13
    |
214 |     let mut failed = 0u32;
    |             ^^^^^^ help: if this is intentional, prefix it with an underscore: `_failed`

warning: variable does not need to be mutable
   --> src-tauri\src\commands\task\facade.rs:213:9
    |
213 |     let mut successful = 0u32;
    |         ----^^^^^^^^^^
    |         |
    |         help: remove this `mut`
    |
    = note: `#[warn(unused_mut)]` on by default

warning: variable does not need to be mutable
   --> src-tauri\src\commands\task\facade.rs:214:9
    |
214 |     let mut failed = 0u32;
    |         ----^^^^^^
    |         |
    |         help: remove this `mut`

warning: variable does not need to be mutable
   --> src-tauri\src\commands\task\facade.rs:215:9
    |
215 |     let mut errors = import_result.errors.clone();
    |         ----^^^^^^
    |         |
    |         help: remove this `mut`

warning: unreachable expression
  --> src-tauri\src\repositories\task_repository_streaming.rs:88:13
   |
88 |             |row| Task::from_row(row),
   |             ^^^^^^^^^^^^^^^^^^^^^^^^^ unreachable expression
...
91 |             unimplemented!("Streaming requires pool integration"),
   |             ----------------------------------------------------- any code following this expression is unreachable
   |
   = note: `#[warn(unreachable_code)]` on by default

warning: unused variable: `conn`
  --> src-tauri\src\repositories\task_repository_streaming.rs:82:13
   |
82 |         let conn = self.pool_manager.get_connection(OperationType::Read)?;
   |             ^^^^ help: if this is intentional, prefix it with an underscore: `_conn`

warning: unused variable: `query`
  --> src-tauri\src\repositories\task_repository_streaming.rs:85:13
   |
85 |         let query = ChunkedQuery::new(
   |             ^^^^^ help: if this is intentional, prefix it with an underscore: `_query`

warning: unused variable: `chunk_size`
  --> src-tauri\src\repositories\task_repository_streaming.rs:32:9
   |
32 |         chunk_size: usize,
   |         ^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_chunk_size`

warning: unused variable: `create_request`
   --> src-tauri\src\services\task_import.rs:147:17
    |
147 |             let create_request = CreateTaskRequest {
    |                 ^^^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_create_request`

warning: unused variable: `quality`
   --> src-tauri\src\services\photo\processing.rs:172:9
    |
172 |         quality: u8,
    |         ^^^^^^^ help: if this is intentional, prefix it with an underscore: `_quality`

warning: unused variable: `vehicle_make`
   --> src-tauri\src\services\task_update.rs:145:21
    |
145 |         if let Some(vehicle_make) = &req.vehicle_make {
    |                     ^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_vehicle_make`

warning: unused variable: `vin`
   --> src-tauri\src\services\task_update.rs:149:21
    |
149 |         if let Some(vin) = &req.vin {
    |                     ^^^ help: if this is intentional, prefix it with an underscore: `_vin`

warning: unused variable: `client_id`
   --> src-tauri\src\services\task_update.rs:153:21
    |
153 |         if let Some(client_id) = &req.client_id {
    |                     ^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_client_id`

warning: unused variable: `scheduled_date`
   --> src-tauri\src\services\task_update.rs:157:21
    |
157 |         if let Some(scheduled_date) = &req.scheduled_date {
    |                     ^^^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_scheduled_date`

warning: unused variable: `estimated_duration`
   --> src-tauri\src\services\task_update.rs:161:21
    |
161 |         if let Some(estimated_duration) = req.estimated_duration {
    |                     ^^^^^^^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_estimated_duration`

warning: unused variable: `notes`
   --> src-tauri\src\services\task_update.rs:165:21
    |
165 |         if let Some(notes) = &req.notes {
    |                     ^^^^^ help: if this is intentional, prefix it with an underscore: `_notes`

warning: fields `conn` and `operation_type` are never read
   --> src-tauri\src\db\operation_pool.rs:209:5
    |
208 | pub struct RoutedConnection {
    |            ---------------- fields in this struct
209 |     conn: PooledConnection<SqliteConnectionManager>,
    |     ^^^^
210 |     operation_type: OperationType,
    |     ^^^^^^^^^^^^^^
    |
    = note: `#[warn(dead_code)]` on by default

warning: field `db` is never read
  --> src-tauri\src\services\workflow_progression.rs:21:5
   |
20 | pub struct WorkflowProgressionService {
   |            -------------------------- field in this struct
21 |     db: Arc<Database>,
   |     ^^
   |
   = note: `WorkflowProgressionService` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

warning: field `db` is never read
  --> src-tauri\src\services\workflow_validation.rs:18:5
   |
17 | pub struct WorkflowValidationService {
   |            ------------------------- field in this struct
18 |     db: Arc<Database>,
   |     ^^
   |
   = note: `WorkflowValidationService` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

warning: methods `read_photo_file`, `read_photo_file_with_path`, and `delete_photo_file` are never used
   --> src-tauri\src\services\photo\storage.rs:221:18
    |
 51 | impl PhotoStorageService {
    | ------------------------ methods in this implementation
...
221 |     pub async fn read_photo_file(
    |                  ^^^^^^^^^^^^^^^
...
239 |     pub async fn read_photo_file_with_path(
    |                  ^^^^^^^^^^^^^^^^^^^^^^^^^
...
254 |     pub async fn delete_photo_file(
    |                  ^^^^^^^^^^^^^^^^^

warning: associated items `with_settings`, `compress_to_webp`, and `compress_to_webp_blocking` are never used
   --> src-tauri\src\services\photo\processing.rs:35:12
    |
 24 | impl PhotoProcessingService {
    | --------------------------- associated items in this implementation
...
 35 |     pub fn with_settings(jpeg_quality: u8, max_file_size: usize) -> Self {
    |            ^^^^^^^^^^^^^
...
141 |     pub async fn compress_to_webp(&self, data: Vec<u8>) -> crate::services::photo::PhotoResult<Vec<u8>> {
    |                  ^^^^^^^^^^^^^^^^
...
170 |     fn compress_to_webp_blocking(
    |        ^^^^^^^^^^^^^^^^^^^^^^^^^

warning: field `db` is never read
  --> src-tauri\src\services\task_import.rs:16:5
   |
15 | pub struct TaskImportService {
   |            ----------------- field in this struct
16 |     db: Arc<Database>,
   |     ^^
   |
   = note: `TaskImportService` has derived impls for the traits `Debug` and `Clone`, but these are intentionally ignored during dead code analysis

warning: field `settings` is never read
  --> src-tauri\src\services\task_validation.rs:16:5
   |
14 | pub struct TaskValidationService {
   |            --------------------- field in this struct
15 |     db: Arc<Database>,
16 |     settings: SettingsService,
   |     ^^^^^^^^
   |
   = note: `TaskValidationService` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

warning: method `get_max_tasks_per_user` is never used
  --> src-tauri\src\services\task_validation.rs:27:8
   |
19 | impl TaskValidationService {
   | -------------------------- method in this implementation
...
27 |     fn get_max_tasks_per_user(&self) -> Result<i32, String> {
   |        ^^^^^^^^^^^^^^^^^^^^^^

warning: use of `async fn` in public traits is discouraged as auto trait bounds cannot be specified
   --> src-tauri\src\services\websocket_event_handler.rs:261:5
    |
261 |     async fn broadcast_event(&self, event: &DomainEvent) -> Result<(), String>;
    |     ^^^^^
    |
    = note: you can suppress this lint if you plan to use the trait only in your own code, or do not care about auto traits like `Send` on the `Future`
    = note: `#[warn(async_fn_in_trait)]` on by default
help: you can alternatively desugar to a normal `fn` that returns `impl Future` and add any desired bounds such as `Send`, but these cannot be relaxed without a breaking API change
    |
261 -     async fn broadcast_event(&self, event: &DomainEvent) -> Result<(), String>;
261 +     fn broadcast_event(&self, event: &DomainEvent) -> impl std::future::Future<Output = Result<(), String>> + Send;
    |

warning: `rpma-ppf-intervention` (lib) generated 39 warnings (run `cargo fix --lib -p rpma-ppf-intervention` to apply 16 suggestions)
warning: unused imports: `OperationPoolConfig`, `OperationPoolManager`, `OperationType`, and `PoolStats`
  --> src-tauri\src\db\mod.rs:26:26
   |
26 | pub use operation_pool::{OperationPoolConfig, OperationPoolManager, OperationType, PoolStats};
   |                          ^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^  ^^^^^^^^^

warning: unused import: `crate::repositories::base::Repository`
  --> src-tauri\src\db\mod.rs:38:9
   |
38 | pub use crate::repositories::base::Repository;
   |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

warning: unused import: `RepoResult`
   --> src-tauri\src\db\mod.rs:120:37
    |
120 | pub use crate::repositories::base::{RepoResult, RepoError};
    |                                     ^^^^^^^^^^

warning: unused import: `audit_repository::AuditRepository`
  --> src-tauri\src\repositories\mod.rs:37:9
   |
37 | pub use audit_repository::AuditRepository;
   |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

warning: unused import: `crate::services::event_bus::event_factory`
  --> src-tauri\src\services\domain_event.rs:10:9
   |
10 | pub use crate::services::event_bus::event_factory;
   |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

warning: `rpma-ppf-intervention` (bin "main") generated 35 warnings (30 duplicates) (run `cargo fix --bin "main"` to apply 5 suggestions)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 2m 14s
     Running `target\debug\main.exe`
2026-02-01T19:41:03.220292Z  INFO ThreadId(01) main: src-tauri\src\main.rs:53: RPMA v2 logging system initialized
2026-02-01T19:41:03.221089Z  INFO ThreadId(01) main: src-tauri\src\main.rs:60: Starting RPMA v2 PPF Intervention application
2026-02-01T19:41:03.221634Z  INFO ThreadId(01) main: src-tauri\src\main.rs:61: Build info: rpma-ppf-intervention v0.1.0
2026-02-01T19:41:04.512167Z  INFO ThreadId(01) main: src-tauri\src\main.rs:280: Initializing application setup
2026-02-01T19:41:04.513292Z DEBUG ThreadId(01) main: src-tauri\src\main.rs:287: App data directory: "C:\\Users\\emaMA\\AppData\\Roaming\\com.rpma.ppf-intervention"
2026-02-01T19:41:04.514400Z DEBUG ThreadId(01) main: src-tauri\src\main.rs:291: Created app data directory
2026-02-01T19:41:04.515003Z  INFO ThreadId(01) main: src-tauri\src\main.rs:295: Database path: "C:\\Users\\emaMA\\AppData\\Roaming\\com.rpma.ppf-intervention\\rpma.db"
2026-02-01T19:41:04.515822Z  INFO ThreadId(01) main: src-tauri\src\main.rs:310: Database file exists: true, size: 585728 bytes
2026-02-01T19:41:04.601379Z  INFO ThreadId(01) main: src-tauri\src\main.rs:320: Database connection established
2026-02-01T19:41:04.605330Z  INFO ThreadId(01) main: src-tauri\src\main.rs:330: Database health check passed
2026-02-01T19:41:04.606904Z DEBUG ThreadId(01) main::db::migrations: src-tauri\src\db\migrations.rs:59: All critical tables found, database appears initialized
2026-02-01T19:41:04.608057Z  INFO ThreadId(01) main: src-tauri\src\main.rs:339: Database already initialized, checking for migrations
2026-02-01T19:41:04.609400Z  INFO ThreadId(01) main: src-tauri\src\main.rs:343: Current version: 25, Target version: 27
2026-02-01T19:41:04.610338Z  INFO ThreadId(01) main::db::migrations: src-tauri\src\db\migrations.rs:1440: Applying migration 26: Add performance optimization indexes
2026-02-01T19:41:04.611859Z  INFO ThreadId(01) main::db::migrations: src-tauri\src\db\migrations.rs:1443: Migration 26: Creating task performance indexes
2026-02-01T19:41:04.617092Z  INFO ThreadId(01) main::db::migrations: src-tauri\src\db\migrations.rs:1473: Migration 26: Creating intervention performance indexes
2026-02-01T19:41:04.620296Z  INFO ThreadId(01) main::db::migrations: src-tauri\src\db\migrations.rs:1484: Migration 26: Creating photo performance indexes
2026-02-01T19:41:04.623155Z ERROR ThreadId(01) main: src-tauri\src\main.rs:346: Failed to apply migrations: Failed to create idx_photos_step_status: no such column: status in CREATE INDEX IF NOT EXISTS idx_phot
os_step_status ON photos(step_id, status) at offset 69

thread 'main' panicked at C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\tauri-2.9.5\src\app.rs:1301:11:
Failed to setup app: error encountered during setup hook: Failed to create idx_photos_step_status: no such column: status in CREATE INDEX IF NOT EXISTS idx_photos_step_status ON photos(step_id, status) at offse
t 69
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
[0201/204104.627:ERROR:ui\gfx\win\window_impl.cc:124] Failed to unregister class Chrome_WidgetWin_0. Error = 1412
error: process didn't exit successfully: `target\debug\main.exe` (exit code: 101)
 ○ Compiling / ...

emaMA@LAPTOP-76DN517M MINGW64 /d/rpma-rust (new-infr)
$
