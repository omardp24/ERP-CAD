import {
IsDateString,
IsNumber,
IsOptional,
IsPositive,
IsString,
} from 'class-validator';

export class CreateAgroHousePaymentDto {
@IsNumber()
@IsPositive()
agroHouseId: number;

@IsOptional()
@IsNumber()
@IsPositive()
purchaseInvoiceId?: number;

@IsNumber()
@IsPositive()
cycleId: number;

@IsDateString()
paymentDate: string;

@IsNumber()
@IsPositive()
amountUsd: number;

@IsOptional()
@IsString()
method?: string; // TRANSFER, ZELLE, EFECTIVO, etc.

@IsOptional()
@IsString()
reference?: string;
}
    