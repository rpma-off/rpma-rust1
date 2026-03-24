export type EntityType =
  | "Task"
  | "Client"
  | "Quote"
  | "Material"
  | "Intervention"
  | "Photo"
  | "Rapport";

export interface DeletedItem {
  id: string;
  entity_type: EntityType;
  display_name: string;
  deleted_at: number;
  deleted_by: string | null;
  deleted_by_name: string | null;
}
