// src/sales/dto/create-sale.dto.ts
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  IsNumber,
} from 'class-validator';

export class CreateSaleDto {
  @IsOptional()
  @IsDateString()
  saleDate?: string;

  @IsOptional()
  @IsEnum(['LOCAL', 'EXPORTACION'] as const)
  type?: 'LOCAL' | 'EXPORTACION';

  @IsOptional()
  @IsEnum(['PROFORMA', 'FACTURA', 'NOTA_ENTREGA'] as const)
  documentType?: 'PROFORMA' | 'FACTURA' | 'NOTA_ENTREGA';

  @IsOptional()
  @IsEnum(['CLIENT', 'PRODUCER'] as const)
  partyType?: 'CLIENT' | 'PRODUCER';

  @IsOptional()
  @IsInt()
  clientId?: number;

  @IsOptional()
  @IsInt()
  producerId?: number;

  @IsOptional()
  @IsBoolean()
  isCredit?: boolean;

  @IsOptional()
  @IsString()
  creditNotes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  // ✅ lo que manda el frontend (select)
  @IsOptional()
  @IsString()
  companyCode?: string;

  @IsOptional()
  @IsEnum(['USD', 'VES'] as const)
  currency?: 'USD' | 'VES';

  // ✅ IVA seleccionado (solo VES)
  @IsOptional()
  @IsInt()
  taxRateId?: number;

  @IsOptional()
  @IsString()
  notes?: string;
  
  @IsOptional()
  @IsInt()
  priceListId?: number;

  // Si algún día lo usas al crear directo en VES (normalmente se pide al confirmar)
  @IsOptional()
  @IsNumber()
  @Min(0)
  rateBcv?: number;
}
