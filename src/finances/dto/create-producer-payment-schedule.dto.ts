import { IsNumber, IsOptional, IsPositive, IsString, IsDateString } from 'class-validator';

export class CreateProducerPaymentScheduleDto {
  @IsNumber()
  @IsPositive()
  producerId: number;

  @IsString()
  cycle: string; // Ej: 'NV25-26'

  @IsString()
  company: 'CAD' | 'SILO_AMAZO';

  @IsNumber()
  @IsPositive()
  amountUsd: number;

  @IsDateString()
  scheduledDate: string;

  @IsOptional()
  @IsNumber()
  adminAccountId?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
