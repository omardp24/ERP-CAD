import {
IsArray,
IsDateString,
IsIn,
IsNotEmpty,
IsNumber,
IsPositive,
IsString,
ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseItemDto {
@IsString()
@IsNotEmpty()
description: string;

@IsNumber()
@IsPositive()
quantity: number;

@IsString()
unit: string; // 'L', 'KG', 'UND', etc.

@IsNumber()
@IsPositive()
unitPrice: number;
}

export class CreatePurchaseInvoiceDto {
@IsNumber()
@IsPositive()
agroHouseId: number;

@IsNumber()
@IsPositive()
cycleId: number;

@IsString()
@IsNotEmpty()
invoiceNumber: string;

@IsDateString()
invoiceDate: string; // se convierte a Date en el service

@IsString()
@IsIn(['USD', 'BS'])
currency: string;

@IsArray()
@ValidateNested({ each: true })
@Type(() => CreatePurchaseItemDto)
items: CreatePurchaseItemDto[];
}
