import {
  IsInt,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';

export class CreateFinancingPlanDto {
  @IsInt()
  producerId: number;

  @IsOptional()
  @IsInt()
  cropPlanId?: number;

  @IsOptional()
  @IsString()
  company?: string; // 'CAD', 'SILO_AMAZO', etc.

  @IsOptional()
  @IsString()
  season?: string; // Ej: 'NV 24-25'

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateFinancingPlanDto {
  @IsOptional()
  @IsInt()
  cropPlanId?: number;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  season?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  totalCost?: number;

  @IsOptional()
  @IsNumber()
  totalPrice?: number;

  @IsOptional()
  @IsNumber()
  totalFinanced?: number;
}
