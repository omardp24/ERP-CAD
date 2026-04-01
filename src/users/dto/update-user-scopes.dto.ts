import { IsArray, IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateUserScopesDto {
  @IsOptional()
  @IsBoolean()
  allProducers?: boolean;

  @IsOptional()
  @IsBoolean()
  allWarehouses?: boolean;

  @IsOptional()
  @IsBoolean()
  allCompanies?: boolean;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  producerIds?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  warehouseIds?: number[];

  // ✅ companies en tu schema es String (CAD / SILO_AMAZO)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  companies?: string[];
}
