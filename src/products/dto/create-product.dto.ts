import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum PricingTag {
  SEMILLA = 'SEMILLA',
  INSUMO = 'INSUMO',
  MATERIA_PRIMA = 'MATERIA_PRIMA',
  PRODUCTO_TERMINADO = 'PRODUCTO_TERMINADO',
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  category?: string | null;

  @IsOptional()
  @IsString()
  unit?: string | null;

  // ✅ obligatorio
  @IsEnum(PricingTag, { message: 'PRICING_TAG_INVALID' })
  pricingTag!: PricingTag;

  // ✅ opcional
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePriceUsd?: number | null;
}
