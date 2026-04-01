import { IsArray, IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserAccessDto {
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  warehouseIds?: number[];

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  producerIds?: number[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  companies?: string[]; // 'CAD' | 'SILO_AMAZO'
}
