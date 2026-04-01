import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateCycleExtraCostDto {
  @IsInt()
  cycleId: number;

  @IsString()
  type: string; // "TRAVEL", "TECH_BONUS", "FUEL", "OTHER", etc.

  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amountUsd?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amountBs?: number;

  @IsNumber()
  rateBcv: number;

  @IsOptional()
  @IsInt()
  supplierId?: number;

  @IsOptional()
  @IsInt()
  cropPlanId?: number;

  @IsOptional()
  occurredAt?: Date;

  @IsOptional()
  metadata?: any;
}
