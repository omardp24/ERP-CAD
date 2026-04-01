import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsIn,
} from 'class-validator';

export class UpdateMovementDto {
  @IsOptional()
  @IsNumber()
  producerId?: number;

  @IsOptional()
  @IsString()
  @IsIn(['ADVANCE', 'PAYMENT', 'ADJUSTMENT'])
  type?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amountUsd?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amountBs?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  rateBcv?: number;
}
