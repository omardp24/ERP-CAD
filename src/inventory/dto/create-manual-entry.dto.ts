export class CreateManualEntryDto {
  inventoryItemId: number;
  quantity: number;
  unitCostUsd: number;
  warehouseId?: number;
  note?: string;
}
