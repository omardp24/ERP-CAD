// src/settings/dto/create-warehouse.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string | null; // ✅ NUEVO
}

