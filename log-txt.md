﻿
emaMA@LAPTOP-76DN517M MINGW64 /d/rpma-rust (Feat/tests)
$ npm run dev

> rpma-rust@0.1.0 dev
> npm run types:sync && set JWT_SECRET=dfc3d7f5c295d19b42e9b3d7eaa9602e45f91a9e5e95cbaa3230fc17e631c74b && npm run tauri dev


> rpma-rust@0.1.0 types:sync
> cd src-tauri && cargo run --bin export-types | node ../scripts/write-types.js

   Compiling rpma-ppf-intervention v0.1.0 (D:\rpma-rust\src-tauri)
warning: unused import: `data_export::export_report_data`
  --> src-tauri\src\commands\reports\export\mod.rs:13:9
   |
13 | pub use data_export::export_report_data;
   |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = note: `#[warn(unused_imports)]` on by default

warning: unused imports: `export_intervention_report` and `save_intervention_report`
  --> src-tauri\src\commands\reports\export\mod.rs:15:5
   |
15 |     export_intervention_report, get_intervention_with_details, save_intervention_report,
   |     ^^^^^^^^^^^^^^^^^^^^^^^^^^                                 ^^^^^^^^^^^^^^^^^^^^^^^^

warning: unused imports: `DateTime` and `Utc`
 --> src-tauri\src\models\material_ts.rs:6:14
  |
6 | use chrono::{DateTime, Utc};
  |              ^^^^^^^^  ^^^

warning: unreachable expression
  --> src-tauri\src\repositories\task_repository_streaming.rs:87:13
   |
87 |             |row| Task::from_row(row),
   |             ^^^^^^^^^^^^^^^^^^^^^^^^^ unreachable expression
...
90 |             unimplemented!("Streaming requires pool integration"),
   |             ----------------------------------------------------- any code following this expression is unreachable
   |
   = note: `#[warn(unreachable_code)]` on by default

warning: unused variable: `conn`
  --> src-tauri\src\repositories\task_repository_streaming.rs:81:13
   |
81 |         let conn = self.pool_manager.get_connection(OperationType::Read)?;
   |             ^^^^ help: if this is intentional, prefix it with an underscore: `_conn`
   |
   = note: `#[warn(unused_variables)]` on by default

warning: unused variable: `query`
  --> src-tauri\src\repositories\task_repository_streaming.rs:84:13
   |
84 |         let query = ChunkedQuery::new(
   |             ^^^^^ help: if this is intentional, prefix it with an underscore: `_query`

warning: unused variable: `chunk_size`
  --> src-tauri\src\repositories\task_repository_streaming.rs:31:9
   |
31 |         chunk_size: usize,
   |         ^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_chunk_size`

warning: unused variable: `create_request`
   --> src-tauri\src\services\task_import.rs:150:17
    |
150 |             let create_request = CreateTaskRequest {
    |                 ^^^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_create_request`

warning: use of deprecated associated function `chrono::DateTime::<Tz>::from_utc`: Use TimeZone::from_utc_datetime() or DateTime::from_naive_utc_and_offset instead
   --> src-tauri\src\models\client.rs:336:54
    |
336 |         return Some(chrono::DateTime::<chrono::Utc>::from_utc(dt, chrono::Utc).timestamp_millis());
    |                                                      ^^^^^^^^
    |
    = note: `#[warn(deprecated)]` on by default

warning: use of deprecated associated function `chrono::DateTime::<Tz>::from_utc`: Use TimeZone::from_utc_datetime() or DateTime::from_naive_utc_and_offset instead
   --> src-tauri\src\models\client.rs:340:54
    |
340 |         return Some(chrono::DateTime::<chrono::Utc>::from_utc(dt, chrono::Utc).timestamp_millis());
    |                                                      ^^^^^^^^

warning: use of deprecated associated function `chrono::DateTime::<Tz>::from_utc`: Use TimeZone::from_utc_datetime() or DateTime::from_naive_utc_and_offset instead
   --> src-tauri\src\models\client.rs:345:54
    |
345 |         return Some(chrono::DateTime::<chrono::Utc>::from_utc(dt, chrono::Utc).timestamp_millis());
    |                                                      ^^^^^^^^

warning: unused import: `ts_rs::TS`
  --> src-tauri\src\models\material.rs:10:5
   |
10 | use ts_rs::TS;
   |     ^^^^^^^^^

warning: unused variable: `stmt`
   --> src-tauri\src\services\audit_service.rs:573:17
    |
573 |         let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    |                 ^^^^ help: if this is intentional, prefix it with an underscore: `_stmt`

warning: variable does not need to be mutable
   --> src-tauri\src\services\audit_service.rs:573:13
    |
573 |         let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    |             ----^^^^
    |             |
    |             help: remove this `mut`
    |
    = note: `#[warn(unused_mut)]` on by default

warning: unused variable: `quality`
   --> src-tauri\src\services\photo\processing.rs:192:9
    |
192 |         quality: u8,
    |         ^^^^^^^ help: if this is intentional, prefix it with an underscore: `_quality`

warning: unused variable: `service`
   --> src-tauri\src\services\task_update.rs:124:9
    |
124 |         service: &TaskUpdateService,
    |         ^^^^^^^ help: if this is intentional, prefix it with an underscore: `_service`

warning: unused variable: `vehicle_make`
   --> src-tauri\src\services\task_update.rs:191:21
    |
191 |         if let Some(vehicle_make) = &req.vehicle_make {
    |                     ^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_vehicle_make`

warning: unused variable: `vin`
   --> src-tauri\src\services\task_update.rs:195:21
    |
195 |         if let Some(vin) = &req.vin {
    |                     ^^^ help: if this is intentional, prefix it with an underscore: `_vin`

warning: unused variable: `scheduled_date`
   --> src-tauri\src\services\task_update.rs:260:21
    |
260 |         if let Some(scheduled_date) = &req.scheduled_date {
    |                     ^^^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_scheduled_date`

warning: unused variable: `estimated_duration`
   --> src-tauri\src\services\task_update.rs:264:21
    |
264 |         if let Some(estimated_duration) = req.estimated_duration {
    |                     ^^^^^^^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_estimated_duration`

warning: unused variable: `notes`
   --> src-tauri\src\services\task_update.rs:268:21
    |
268 |         if let Some(notes) = &req.notes {
    |                     ^^^^^ help: if this is intentional, prefix it with an underscore: `_notes`

warning: function `copy_file_with_validation` is never used
  --> src-tauri\src\commands\reports\utils.rs:11:8
   |
11 | pub fn copy_file_with_validation(
   |        ^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = note: `#[warn(dead_code)]` on by default

warning: function `manual_file_copy` is never used
  --> src-tauri\src\commands\reports\utils.rs:82:8
   |
82 | pub fn manual_file_copy(source: &Path, dest: &Path) -> Result<u64, std::io::Error> {
   |        ^^^^^^^^^^^^^^^^

warning: function `format_report_data_for_pdf` is never used
   --> src-tauri\src\commands\reports\utils.rs:169:8
    |
169 | pub fn format_report_data_for_pdf(report_data: &serde_json::Value) -> Vec<String> {
    |        ^^^^^^^^^^^^^^^^^^^^^^^^^^

warning: function `format_report_data_for_csv` is never used
   --> src-tauri\src\commands\reports\utils.rs:193:8
    |
193 | pub fn format_report_data_for_csv(report_data: &serde_json::Value) -> String {
    |        ^^^^^^^^^^^^^^^^^^^^^^^^^^

warning: fields `conn` and `operation_type` are never read
   --> src-tauri\src\db\operation_pool.rs:207:5
    |
206 | pub struct RoutedConnection {
    |            ---------------- fields in this struct
207 |     conn: PooledConnection<SqliteConnectionManager>,
    |     ^^^^
208 |     operation_type: OperationType,
    |     ^^^^^^^^^^^^^^

warning: fields `backend` and `compression_threshold` are never read
  --> src-tauri\src\services\cache.rs:84:5
   |
83 | pub struct CacheManager {
   |            ------------ fields in this struct
84 |     backend: CacheBackend,
   |     ^^^^^^^
...
88 |     compression_threshold: usize,
   |     ^^^^^^^^^^^^^^^^^^^^^
   |
   = note: `CacheManager` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

warning: method `decompress_data` is never used
   --> src-tauri\src\services\cache.rs:448:8
    |
 93 | impl CacheManager {
    | ----------------- method in this implementation
...
448 |     fn decompress_data(&self, data: &str) -> Result<String, AppError> {
    |        ^^^^^^^^^^^^^^^

warning: field `created_at` is never read
   --> src-tauri\src\services\geo.rs:330:9
    |
320 | struct LocationRow {
    |        ----------- field in this struct
...
330 |     pub created_at: i64,
    |         ^^^^^^^^^^
    |
    = note: `LocationRow` has derived impls for the traits `Clone` and `Debug`, but these are intentionally ignored during dead code analysis

warning: field `id` is never read
   --> src-tauri\src\services\geo.rs:335:9
    |
334 | struct CoverageRow {
    |        ----------- field in this struct
335 |     pub id: String,
    |         ^^
    |
    = note: `CoverageRow` has derived impls for the traits `Clone` and `Debug`, but these are intentionally ignored during dead code analysis

warning: associated items `with_settings`, `compress_to_webp`, and `compress_to_webp_blocking` are never used
   --> src-tauri\src\services\photo\processing.rs:35:12
    |
 24 | impl PhotoProcessingService {
    | --------------------------- associated items in this implementation
...
 35 |     pub fn with_settings(jpeg_quality: u8, max_file_size: usize) -> Self {
    |            ^^^^^^^^^^^^^
...
151 |     pub async fn compress_to_webp(
    |                  ^^^^^^^^^^^^^^^^
...
190 |     fn compress_to_webp_blocking(
    |        ^^^^^^^^^^^^^^^^^^^^^^^^^

warning: methods `read_photo_file`, `read_photo_file_with_path`, and `delete_photo_file` are never used
   --> src-tauri\src\services\photo\storage.rs:215:18
    |
 51 | impl PhotoStorageService {
    | ------------------------ methods in this implementation
...
215 |     pub async fn read_photo_file(
    |                  ^^^^^^^^^^^^^^^
...
230 |     pub async fn read_photo_file_with_path(
    |                  ^^^^^^^^^^^^^^^^^^^^^^^^^
...
242 |     pub async fn delete_photo_file(
    |                  ^^^^^^^^^^^^^^^^^

warning: method `ensure_user_settings_exist` is never used
    --> src-tauri\src\services\settings.rs:1089:8
     |
  92 | impl SettingsService {
     | -------------------- method in this implementation
...
1089 |     fn ensure_user_settings_exist(&self, user_id: &str) -> Result<(), AppError> {
     |        ^^^^^^^^^^^^^^^^^^^^^^^^^^

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
   --> src-tauri\src\services\task_validation.rs:139:5
    |
137 | pub struct TaskValidationService {
    |            --------------------- field in this struct
138 |     db: Arc<Database>,
139 |     settings: SettingsService,
    |     ^^^^^^^^
    |
    = note: `TaskValidationService` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

warning: method `get_max_tasks_per_user` is never used
   --> src-tauri\src\services\task_validation.rs:150:8
    |
142 | impl TaskValidationService {
    | -------------------------- method in this implementation
...
150 |     fn get_max_tasks_per_user(&self) -> Result<i32, String> {
    |        ^^^^^^^^^^^^^^^^^^^^^^

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

warning: use of `async fn` in public traits is discouraged as auto trait bounds cannot be specified
   --> src-tauri\src\services\websocket_event_handler.rs:276:5
    |
276 |     async fn broadcast_event(&self, event: &DomainEvent) -> Result<(), String>;
    |     ^^^^^
    |
    = note: you can suppress this lint if you plan to use the trait only in your own code, or do not care about auto traits like `Send` on the `Future`
    = note: `#[warn(async_fn_in_trait)]` on by default
help: you can alternatively desugar to a normal `fn` that returns `impl Future` and add any desired bounds such as `Send`, but these cannot be relaxed without a breaking API change
    |
276 -     async fn broadcast_event(&self, event: &DomainEvent) -> Result<(), String>;
276 +     fn broadcast_event(&self, event: &DomainEvent) -> impl std::future::Future<Output = Result<(), String>> + Send;
    |

warning: `rpma-ppf-intervention` (lib) generated 39 warnings (run `cargo fix --lib -p rpma-ppf-intervention` to apply 4 suggestions)
warning: unused import: `MaterialConsumption as ReportsMaterialConsumption`
  --> src-tauri\src\bin\export-types.rs:47:48
   |
47 |         InterventionReportResult, KpiCategory, MaterialConsumption as ReportsMaterialConsumption,
   |                                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = note: `#[warn(unused_imports)]` on by default

error[E0599]: the function or associated item `export_to_string` exists for struct `Material`, but its trait bounds were not satisfied
   --> src-tauri\src\bin\export-types.rs:234:30
    |
234 |         .push_str(&Material::export_to_string().expect("Failed to export Material type"));
    |                              ^^^^^^^^^^^^^^^^ function or associated item cannot be called on `Material` due to unsatisfied trait bounds
    |
   ::: D:\rpma-rust\src-tauri\src\models\material.rs:70:1
    |
 70 | pub struct Material {
    | ------------------- doesn't satisfy `Material: TS`
    |
note: if you're trying to build a new `Material`, consider using `Material::new` which returns `Material`
   --> D:\rpma-rust\src-tauri\src\models\material.rs:132:5
    |
132 |     pub fn new(id: String, sku: String, name: String, material_type: MaterialType) -> Self {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    = note: the following trait bounds were not satisfied:
            `Material: TS`
            which is required by `&Material: TS`

error[E0599]: the function or associated item `export_to_string` exists for struct `rpma_ppf_intervention::MaterialConsumption`, but its trait bounds were not satisfied
   --> src-tauri\src\bin\export-types.rs:237:31
    |
237 |         &MaterialConsumption::export_to_string()
    |                               ^^^^^^^^^^^^^^^^ function or associated item cannot be called on `rpma_ppf_intervention::MaterialConsumption` due to unsatisfied trait bounds
    |
   ::: D:\rpma-rust\src-tauri\src\models\material.rs:289:1
    |
289 | pub struct MaterialConsumption {
    | ------------------------------ doesn't satisfy `rpma_ppf_intervention::MaterialConsumption: TS`
    |
note: if you're trying to build a new `rpma_ppf_intervention::MaterialConsumption`, consider using `rpma_ppf_intervention::MaterialConsumption::new` which returns `rpma_ppf_intervention::MaterialConsumption`
   --> D:\rpma-rust\src-tauri\src\models\material.rs:324:5
    |
324 | /     pub fn new(
325 | |         id: String,
326 | |         intervention_id: String,
327 | |         material_id: String,
328 | |         quantity_used: f64,
329 | |     ) -> Self {
    | |_____________^
    = note: the following trait bounds were not satisfied:
            `rpma_ppf_intervention::MaterialConsumption: TS`
            which is required by `&rpma_ppf_intervention::MaterialConsumption: TS`

error[E0599]: the function or associated item `export_to_string` exists for struct `MaterialStats`, but its trait bounds were not satisfied
   --> src-tauri\src\bin\export-types.rs:242:35
    |
242 |         .push_str(&MaterialStats::export_to_string().expect("Failed to export MaterialStats type"));
    |                                   ^^^^^^^^^^^^^^^^ function or associated item cannot be called on `MaterialStats` due to unsatisfied trait bounds
    |
   ::: D:\rpma-rust\src-tauri\src\models\material.rs:397:1
    |
397 | pub struct MaterialStats {
    | ------------------------ doesn't satisfy `MaterialStats: TS`
    |
    = note: the following trait bounds were not satisfied:
            `MaterialStats: TS`
            which is required by `&MaterialStats: TS`

error[E0599]: the function or associated item `export_to_string` exists for struct `InventoryStats`, but its trait bounds were not satisfied
   --> src-tauri\src\bin\export-types.rs:245:26
    |
245 |         &InventoryStats::export_to_string().expect("Failed to export InventoryStats type"),
    |                          ^^^^^^^^^^^^^^^^ function or associated item cannot be called on `InventoryStats` due to unsatisfied trait bounds
    |
   ::: D:\rpma-rust\src-tauri\src\models\material.rs:813:1
    |
813 | pub struct InventoryStats {
    | ------------------------- doesn't satisfy `InventoryStats: TS`
    |
    = note: the following trait bounds were not satisfied:
            `InventoryStats: TS`
            which is required by `&InventoryStats: TS`

error[E0599]: the function or associated item `export_to_string` exists for struct `InventoryTransaction`, but its trait bounds were not satisfied
   --> src-tauri\src\bin\export-types.rs:249:32
    |
249 |         &InventoryTransaction::export_to_string()
    |                                ^^^^^^^^^^^^^^^^ function or associated item cannot be called on `InventoryTransaction` due to unsatisfied trait bounds
    |
   ::: D:\rpma-rust\src-tauri\src\models\material.rs:666:1
    |
666 | pub struct InventoryTransaction {
    | ------------------------------- doesn't satisfy `InventoryTransaction: TS`
    |
note: if you're trying to build a new `InventoryTransaction`, consider using `InventoryTransaction::new` which returns `InventoryTransaction`
   --> D:\rpma-rust\src-tauri\src\models\material.rs:715:5
    |
715 | /     pub fn new(
716 | |         id: String,
717 | |         material_id: String,
718 | |         transaction_type: InventoryTransactionType,
...   |
722 | |         performed_by: String,
723 | |     ) -> Self {
    | |_____________^
    = note: the following trait bounds were not satisfied:
            `InventoryTransaction: TS`
            which is required by `&InventoryTransaction: TS`

error[E0599]: the variant or associated item `export_to_string` exists for enum `InventoryTransactionType`, but its trait bounds were not satisfied
   --> src-tauri\src\bin\export-types.rs:254:36
    |
254 |         &InventoryTransactionType::export_to_string()
    |                                    ^^^^^^^^^^^^^^^^ variant or associated item cannot be called on `InventoryTransactionType` due to unsatisfied trait bounds
    |
   ::: D:\rpma-rust\src-tauri\src\models\material.rs:558:1
    |
558 | pub enum InventoryTransactionType {
    | --------------------------------- doesn't satisfy `InventoryTransactionType: TS`
    |
    = note: the following trait bounds were not satisfied:
            `InventoryTransactionType: TS`
            which is required by `&InventoryTransactionType: TS`

error[E0599]: the function or associated item `export_to_string` exists for struct `Supplier`, but its trait bounds were not satisfied
   --> src-tauri\src\bin\export-types.rs:259:30
    |
259 |         .push_str(&Supplier::export_to_string().expect("Failed to export Supplier type"));
    |                              ^^^^^^^^^^^^^^^^ function or associated item cannot be called on `Supplier` due to unsatisfied trait bounds
    |
   ::: D:\rpma-rust\src-tauri\src\models\material.rs:429:1
    |
429 | pub struct Supplier {
    | ------------------- doesn't satisfy `Supplier: TS`
    |
note: if you're trying to build a new `Supplier`, consider using `Supplier::new` which returns `Supplier`
   --> D:\rpma-rust\src-tauri\src\models\material.rs:480:5
    |
480 |     pub fn new(id: String, name: String) -> Self {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    = note: the following trait bounds were not satisfied:
            `Supplier: TS`
            which is required by `&Supplier: TS`

error[E0599]: the function or associated item `export_to_string` exists for struct `MaterialCategory`, but its trait bounds were not satisfied
   --> src-tauri\src\bin\export-types.rs:262:28
    |
262 |         &MaterialCategory::export_to_string().expect("Failed to export MaterialCategory type"),
    |                            ^^^^^^^^^^^^^^^^ function or associated item cannot be called on `MaterialCategory` due to unsatisfied trait bounds
    |
   ::: D:\rpma-rust\src-tauri\src\models\material.rs:588:1
    |
588 | pub struct MaterialCategory {
    | --------------------------- doesn't satisfy `MaterialCategory: TS`
    |
note: if you're trying to build a new `MaterialCategory`, consider using `MaterialCategory::new` which returns `MaterialCategory`
   --> D:\rpma-rust\src-tauri\src\models\material.rs:618:5
    |
618 |     pub fn new(id: String, name: String, level: i32) -> Self {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    = note: the following trait bounds were not satisfied:
            `MaterialCategory: TS`
            which is required by `&MaterialCategory: TS`

error[E0599]: the function or associated item `export_to_string` exists for struct `InterventionMaterialSummary`, but its trait bounds were not satisfied
   --> src-tauri\src\bin\export-types.rs:266:39
    |
266 |         &InterventionMaterialSummary::export_to_string()
    |                                       ^^^^^^^^^^^^^^^^ function or associated item cannot be called on `InterventionMaterialSummary` due to unsatisfied trait bounds
    |
   ::: D:\rpma-rust\src-tauri\src\models\material.rs:408:1
    |
408 | pub struct InterventionMaterialSummary {
    | -------------------------------------- doesn't satisfy `InterventionMaterialSummary: TS`
    |
    = note: the following trait bounds were not satisfied:
            `InterventionMaterialSummary: TS`
            which is required by `&InterventionMaterialSummary: TS`

error[E0599]: the function or associated item `export_to_string` exists for struct `MaterialConsumptionSummary`, but its trait bounds were not satisfied
   --> src-tauri\src\bin\export-types.rs:271:38
    |
271 |         &MaterialConsumptionSummary::export_to_string()
    |                                      ^^^^^^^^^^^^^^^^ function or associated item cannot be called on `MaterialConsumptionSummary` due to unsatisfied trait bounds
    |
   ::: D:\rpma-rust\src-tauri\src\models\material.rs:417:1
    |
417 | pub struct MaterialConsumptionSummary {
    | ------------------------------------- doesn't satisfy `MaterialConsumptionSummary: TS`
    |
    = note: the following trait bounds were not satisfied:
            `MaterialConsumptionSummary: TS`
            which is required by `&MaterialConsumptionSummary: TS`

error[E0599]: the function or associated item `export_to_string` exists for struct `InventoryMovementSummary`, but its trait bounds were not satisfied
   --> src-tauri\src\bin\export-types.rs:276:36
    |
276 |         &InventoryMovementSummary::export_to_string()
    |                                    ^^^^^^^^^^^^^^^^ function or associated item cannot be called on `InventoryMovementSummary` due to unsatisfied trait bounds
    |
   ::: D:\rpma-rust\src-tauri\src\models\material.rs:827:1
    |
827 | pub struct InventoryMovementSummary {
    | ----------------------------------- doesn't satisfy `InventoryMovementSummary: TS`
    |
    = note: the following trait bounds were not satisfied:
            `InventoryMovementSummary: TS`
            which is required by `&InventoryMovementSummary: TS`

error[E0599]: the function or associated item `export_to_string` exists for struct `rpma_ppf_intervention::MaterialConsumption`, but its trait bounds were not satisfied
   --> src-tauri\src\bin\export-types.rs:863:31
    |
863 |         &MaterialConsumption::export_to_string()
    |                               ^^^^^^^^^^^^^^^^ function or associated item cannot be called on `rpma_ppf_intervention::MaterialConsumption` due to unsatisfied trait bounds
    |
   ::: D:\rpma-rust\src-tauri\src\models\material.rs:289:1
    |
289 | pub struct MaterialConsumption {
    | ------------------------------ doesn't satisfy `rpma_ppf_intervention::MaterialConsumption: TS`
    |
note: if you're trying to build a new `rpma_ppf_intervention::MaterialConsumption`, consider using `rpma_ppf_intervention::MaterialConsumption::new` which returns `rpma_ppf_intervention::MaterialConsumption`
   --> D:\rpma-rust\src-tauri\src\models\material.rs:324:5
    |
324 | /     pub fn new(
325 | |         id: String,
326 | |         intervention_id: String,
327 | |         material_id: String,
328 | |         quantity_used: f64,
329 | |     ) -> Self {
    | |_____________^
    = note: the following trait bounds were not satisfied:
            `rpma_ppf_intervention::MaterialConsumption: TS`
            which is required by `&rpma_ppf_intervention::MaterialConsumption: TS`

For more information about this error, try `rustc --explain E0599`.
warning: `rpma-ppf-intervention` (bin "export-types") generated 1 warning
error: could not compile `rpma-ppf-intervention` (bin "export-types") due to 12 previous errors; 1 warning emitted
❌ Missing exports: TaskStatus, TaskPriority, UserAccount
This may cause TypeScript compilation errors. Please check the Rust type generation.

emaMA@LAPTOP-76DN517M MINGW64 /d/rpma-rust (Feat/tests)
$
