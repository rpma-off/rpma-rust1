// Application layer for the Tasks bounded context.
//
// Re-exports the public request/response contracts and domain types
// used by IPC handlers and other bounded contexts.

pub use crate::domains::tasks::ipc::task::facade::{
    AddTaskNoteRequest, BulkImportResponse, DelayTaskRequest, EditTaskRequest,
    ExportTasksCsvRequest, ImportTasksBulkRequest, ReportTaskIssueRequest, SendTaskMessageRequest,
    TaskCrudRequest,
};
pub use crate::domains::tasks::ipc::task::queries::{
    GetAverageDurationByStatusRequest, GetCompletionRateRequest, GetTaskStatisticsRequest,
    GetTasksWithClientsRequest,
};
pub use crate::domains::tasks::ipc::task_types::{
    TaskFilter, TaskQuery, TaskStatistics, TaskStats, TaskWithClient,
};
