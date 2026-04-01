import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePurchaseInvoiceAttachmentDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  @IsString()
  fileType?: string; // 'application/pdf', 'image/jpeg', etc.

  @IsOptional()
  @IsString()
  category?: string; // 'FACTURA', 'ORDEN_COMPRA', 'OTRO', etc.

  @IsOptional()
  @IsString()
  description?: string;
}
