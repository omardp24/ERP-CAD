import { AdministrativeMovementType } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAdminMovementDto {
  @IsInt()
  accountId: number;

  @IsEnum(AdministrativeMovementType)
  type: AdministrativeMovementType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}
