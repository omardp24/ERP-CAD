import { IsInt, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class ExecuteProducerPaymentScheduleDto {
  // Tasa BCV con la que se ejecuta el pago
  @IsNumber()
  @IsPositive()
  rateBcv: number;

  // Cuenta administrativa desde donde se pagará (si no viene, se usa la del schedule)
  @IsOptional()
  @IsInt()
  adminAccountId?: number;
}
