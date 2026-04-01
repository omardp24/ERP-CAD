import { IsEnum, IsNumber, IsOptional, IsString, Min, IsInt } from 'class-validator';

export enum SalePaymentMethodDto {
  CASH = 'CASH',
  BANK = 'BANK',
  TRANSFER = 'TRANSFER',
  OTHER = 'OTHER',
  IN_KIND = 'IN_KIND',
}

export class CreateSalePaymentDto {
  @IsNumber()
  @Min(0.01)
  amountUsd: number;

  @IsOptional()
  @IsEnum(SalePaymentMethodDto)
  method?: SalePaymentMethodDto;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  adminAccountId?: number;
}
