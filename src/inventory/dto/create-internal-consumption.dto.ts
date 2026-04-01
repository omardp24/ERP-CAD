// src/inventory/dto/create-internal-consumption.dto.ts
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateInternalConsumptionDto {
  // Por ahora usaremos productId desde el front,
  // pero lo vamos a mapear a un InventoryItem.
  @IsOptional()
  @IsInt()
  productId?: number;

  // Si algún día quieres enviar directamente el id del InventoryItem
  @IsOptional()
  @IsInt()
  inventoryItemId?: number;

  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsInt()
  warehouseId?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
