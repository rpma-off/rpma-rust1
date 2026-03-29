import type { MaterialType } from '../api/types';

export type {
  CreateMaterialRequest,
  UpdateStockRequest,
  RecordConsumptionRequest,
} from '../server';

export interface InventoryQuery {
  material_type?: MaterialType | null;
  category?: string | null;
  active_only?: boolean;
  limit?: number;
  offset?: number;
}
