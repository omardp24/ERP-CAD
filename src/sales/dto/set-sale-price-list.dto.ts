import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class SetSalePriceListDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  priceListId?: number; // permitir null/undefined para limpiar si quieres
}
