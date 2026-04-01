import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateFinancedItemDto {
  @IsInt()
  cycleId: number;

  @IsOptional()
  @IsInt()
  producerId?: number;

  @IsOptional()
  @IsInt()
  cropPlanId?: number;

  @IsOptional()
  @IsInt()
  supplierId?: number;

  @IsOptional()
  @IsInt()
  inventoryItemId?: number;

  @IsString()
  name: string;

  @IsString()
  category: string; // INPUT, FUEL, CASH_ADVANCE, etc.

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string; // KG, L, UND, etc.

  @IsNumber()
  @IsPositive()
  unitCost: number; // costo base

  @IsNumber()
  @IsPositive()
  unitPrice: number; // precio al productor

  @IsNumber()
  rateBcv: number;

  @IsOptional()
  @IsNumber()
  financingPercent?: number; // si viene vacío, usamos 100 en el servicio

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  metadata?: any;
}
