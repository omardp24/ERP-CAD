import { AdministrativeAccountType, Currency } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAdminAccountDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEnum(Currency)
  currency: Currency;

  @IsEnum(AdministrativeAccountType)
  type: AdministrativeAccountType;

  @IsOptional()
  @IsNumber()
  balance?: number;
}
