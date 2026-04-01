import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminFinancesService } from './admin.service';
import { CreateAdminAccountDto } from './dto/create-admin-account.dto';
import { CreateAdminMovementDto } from './dto/create-admin-movement.dto';
import { CreateAdminTransferDto } from './dto/create-admin-transfer.dto';
import { GetAdminAuditLogsDto } from '../dto/get-admin-audit-logs.dto';

import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guards';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminFinancesController {
  constructor(
    private readonly adminFinancesService: AdminFinancesService,
  ) {}

  @Post('account')
  @Roles(UserRole.ADMIN)
  async createAdminAccount(@Body() dto: CreateAdminAccountDto) {
    return this.adminFinancesService.createAccount(dto);
  }

  @Post('movement')
  @Roles(UserRole.ADMIN)
  async createAdminMovement(@Body() dto: CreateAdminMovementDto) {
    return this.adminFinancesService.createMovement(dto);
  }

  @Post('transfer')
  @Roles(UserRole.ADMIN)
  async createAdminTransfer(@Body() dto: CreateAdminTransferDto) {
    return this.adminFinancesService.createTransfer(dto);
  }

  @Get('audit-logs')
  @Roles(UserRole.ADMIN)
  async getAuditLogs(@Query() query: GetAdminAuditLogsDto) {
    return this.adminFinancesService.getAdministrativeAuditLogs(query);
  }
}
