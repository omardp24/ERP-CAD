import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateFinancingCycleDto {
  @IsString()
  @IsNotEmpty()
  code: string; // Ej: NV2526, PV2526, INV25

  @IsOptional()
  @IsString()
  name?: string; // Nombre bonito: "Norte Verano 25-26"

  @IsOptional()
  @IsString()
  season?: string; // "2025-2026"

  @IsOptional()
  @IsISO8601()
  startDate?: string; // "2025-11-01"

  @IsOptional()
  @IsISO8601()
  endDate?: string; // "2026-03-31"

  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'CLOSED', 'DRAFT'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

