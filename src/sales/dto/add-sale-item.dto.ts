// src/sales/dto/add-sale-item.dto.ts
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class AddSaleItemDto {
  @IsInt()
  inventoryItemId: number;

  @IsNumber()
  @IsPositive()
  quantity: number;

  // ✅ Opcional: si no viene, el backend lo calcula desde la lista de precios
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPriceUsd?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  description?: string;
}