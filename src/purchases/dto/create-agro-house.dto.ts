import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAgroHouseBankAccountDto {
  @IsString()
  bankName: string;

  @IsString()
  accountNumber: string;

  @IsOptional()
  @IsString()
  accountType?: string; // CORRIENTE, AHORRO, etc.

  @IsOptional()
  @IsString()
  currency?: string; // USD, VES, etc.

  @IsOptional()
  @IsString()
  holderName?: string;

  @IsOptional()
  @IsString()
  holderId?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateAgroHouseDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  rif?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAgroHouseBankAccountDto)
  bankAccounts?: CreateAgroHouseBankAccountDto[];
}
