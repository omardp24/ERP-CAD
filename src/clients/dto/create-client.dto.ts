import { IsOptional, IsString } from 'class-validator';

export class CreateClientDto {
  @IsString()
  name: string;

  @IsOptional() @IsString()
  rif?: string;

  @IsOptional() @IsString()
  email?: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsString()
  address?: string;
}
