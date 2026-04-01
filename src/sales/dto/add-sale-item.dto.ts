// src/sales/dto/add-sale-item.dto.ts
import { IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class AddSaleItemDto {
  @IsInt()
  inventoryItemId: number;

  @IsNumber()
  @IsPositive()
  quantity: number;

  // En ventas usamos USD como base (aunque el documento sea VES, luego aplicas rate/iva)
  @IsNumber()
  @Min(0)
  unitPriceUsd: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
