import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';

export enum ProducerStatus {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}

export class CreateProducerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  municipality?: string;

  @IsOptional()
  @IsString()
  town?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(ProducerStatus)
  status?: ProducerStatus;

  @IsOptional()
  @IsNumber()
  totalAreaHa?: number;
}
