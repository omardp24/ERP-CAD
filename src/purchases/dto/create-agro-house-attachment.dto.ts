import { IsNotEmpty, IsOptional, IsString } from 'class-validator';


export class CreateAgroHouseAttachmentDto {
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
  category?: string; // 'RIF', 'CONTRATO', 'OTRO', etc.

  @IsOptional()
  @IsString()
  description?: string;
}
