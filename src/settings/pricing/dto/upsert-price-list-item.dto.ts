import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { PriceItemMode } from '@prisma/client';

export class UpsertPriceListItemDto {
  @IsInt()
  inventoryItemId: number;

  @IsOptional()
  @IsEnum(PriceItemMode)
  mode?: PriceItemMode; // MARGIN_OVER_COST | FIXED_PRICE

  @IsOptional()
  @IsNumber()
  fixedPriceUsd?: number | null;

  @IsOptional()
  @IsNumber()
  marginPct?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
