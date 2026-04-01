// src/sales/dto/update-sale-draft.dto.ts
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  Currency,
  SaleDocumentType,
  SalePartyType,
  SaleType,
} from '@prisma/client';

export class UpdateSaleDraftDto {
  // ===== Header =====

  @IsOptional()
  @IsDateString()
  saleDate?: string;

  @IsOptional()
  @IsEnum(SaleType)
  type?: SaleType;

  @IsOptional()
  @IsEnum(SaleDocumentType)
  documentType?: SaleDocumentType;

  @IsOptional()
  @IsEnum(SalePartyType)
  partyType?: SalePartyType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clientId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  producerId?: number | null;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  // ===== Crédito productor =====

  @IsOptional()
  @IsBoolean()
  isCredit?: boolean;

  @IsOptional()
  @IsString()
  creditNotes?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  // ===== BCV =====

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rateBcv?: number | null;

  // ===== Price list =====

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priceListId?: number | null;

  // ===== IVA (aplica al total) =====

  @IsOptional()
  @IsBoolean()
  applyVat?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate?: number;

  // ===== Notes =====

  @IsOptional()
  @IsString()
  notes?: string | null;
}
