import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAdminTransferDto {
  @IsInt()
  fromAccountId: number;

  @IsInt()
  toAccountId: number;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}
