import { IsInt, IsOptional, IsString, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAdminAuditLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  entityId?: number;

  @IsOptional()
  @IsString()
  @IsIn(['CREATE', 'UPDATE', 'DELETE'])
  action?: 'CREATE' | 'UPDATE' | 'DELETE';

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number;
}
