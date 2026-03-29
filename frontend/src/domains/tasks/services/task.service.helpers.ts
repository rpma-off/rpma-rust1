import type {
  PaginationInfo,
  TaskQuery,
  UpdateTaskRequest,
} from "@/lib/backend";
import type { TaskWithDetails } from "@/types/task.types";
import type { ServiceResponse } from "@/types/unified.types";

export const EMPTY_UPDATE_TASK_REQUEST: UpdateTaskRequest = {
  id: null,
  title: null,
  description: null,
  priority: null,
  status: null,
  vehicle_plate: null,
  vehicle_model: null,
  vehicle_year: null,
  vehicle_make: null,
  vin: null,
  ppf_zones: null,
  custom_ppf_zones: null,
  client_id: null,
  customer_name: null,
  customer_email: null,
  customer_phone: null,
  customer_address: null,
  external_id: null,
  lot_film: null,
  checklist_completed: null,
  scheduled_date: null,
  start_time: null,
  end_time: null,
  date_rdv: null,
  heure_rdv: null,
  template_id: null,
  workflow_id: null,
  estimated_duration: null,
  notes: null,
  tags: null,
  technician_id: null,
};

export function buildUpdateRequest(
  partial: Partial<UpdateTaskRequest>,
): UpdateTaskRequest {
  return {
    ...EMPTY_UPDATE_TASK_REQUEST,
    ...partial,
  };
}

export function successResponse<T>(data: T, status = 200): ServiceResponse<T> {
  return {
    success: true,
    data,
    status,
  };
}

export function errorResponse(error: unknown, status = 500): ServiceResponse<never> {
  const normalizedError =
    error instanceof Error ? error : new Error(String(error));
  return {
    success: false,
    error: normalizedError.message,
    status,
  };
}

export function notFoundResponse(message = "Task not found"): ServiceResponse<never> {
  return {
    success: false,
    error: message,
    status: 404,
  };
}

export function mapTaskListResult(
  result: { data: unknown; pagination: PaginationInfo },
): ServiceResponse<{ data: TaskWithDetails[]; pagination: PaginationInfo }> {
  return successResponse({
    data: result.data as TaskWithDetails[],
    pagination: result.pagination,
  });
}

export function appendInvalidReason(
  task: { notes?: unknown },
  reason?: string,
): string | null {
  const existingNotes = task.notes ? String(task.notes) : "";
  if (!reason) {
    return existingNotes || null;
  }
  return `${existingNotes}${existingNotes ? "\n" : ""}Invalid: ${reason}`;
}

export function buildValidatedTaskQuery(query: {
  limit?: number | null;
  offset?: number | null;
  status?: TaskQuery["status"];
  priority?: TaskQuery["priority"];
  technician_id?: string | null;
  client_id?: string | null;
  search?: string | null;
}) {
  const limit = query.limit ?? 20;
  const offset = query.offset ?? 0;
  const page = Math.floor(offset / limit) + 1;

  return {
    pagination: {
      page,
      page_size: limit,
      sort_by: null,
      sort_order: null,
    },
    status: query.status ?? null,
    priority: query.priority ?? null,
    technician_id: query.technician_id ?? null,
    client_id: query.client_id ?? null,
    search: query.search ?? null,
  };
}
