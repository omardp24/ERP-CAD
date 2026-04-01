import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PricingTag } from './create-product.dto';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsString()
  category?: string | null;

  @IsOptional()
  @IsString()
  unit?: string | null;

  @IsOptional()
  @IsEnum(PricingTag, { message: 'PRICING_TAG_INVALID' })
  pricingTag?: PricingTag;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePriceUsd?: number | null;
}
