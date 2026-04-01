import { IsNumber, IsOptional, Min } from 'class-validator';

export class ConfirmSaleDto {
  // si currency=VES y quieres guardar rate bcv
  @IsOptional()
  @IsNumber()
  @Min(0)
  rateBcv?: number;
}
