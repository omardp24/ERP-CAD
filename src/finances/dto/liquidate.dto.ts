import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class LiquidateDto {
  @IsOptional()
  @IsNumber()
  producerId?: number;

  @IsNumber()
  @IsPositive()
  kgEntregados: number;

  @IsNumber()
  @IsPositive()
  precioKgUsd: number;

  @IsNumber()
  @IsPositive()
  rateBcv: number;

  @IsOptional()
  @IsString()
  description?: string;

  // NUEVO: id del plan de siembra (crop_plans)
  @IsOptional()
  @IsNumber()
  cropPlanId?: number;

@IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;
}

