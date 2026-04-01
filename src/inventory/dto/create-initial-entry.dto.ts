import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateInitialEntryDto {
  @IsInt()
  productId: number;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitCostUsd: number;

  @IsOptional()
  @IsInt()
  warehouseId?: number;

  @IsOptional()
  @IsString()
  company?: string;
}
