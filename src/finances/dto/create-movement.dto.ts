import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsIn,
  IsISO8601,
} from 'class-validator';

export class CreateMovementDto {
  @IsOptional()
  @IsNumber()
  producerId?: number;

  @IsString()
  @IsIn(['ADVANCE', 'PAYMENT', 'ADJUSTMENT'])
  type: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amountUsd?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amountBs?: number;

  @IsNumber()
  @IsPositive()
  rateBcv: number;

  @IsOptional()
  @IsNumber()
  cropPlanId?: number;

  // documentos
  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  commissionType?: 'FLAT' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

  @IsOptional()
  @IsNumber()
  commissionRate?: number; // ej: 5 = 5%

  @IsOptional()
  @IsString()
  commissionCurrency?: 'USD' | 'BS';

    @IsOptional()
  @IsNumber()
  adminAccountId?: number;

  @IsOptional()
  @IsISO8601()
  movementDate?: string;

  @IsOptional()
  @IsString()
  company?: 'CAD' | 'SILO_AMAZO';
}

