import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import {
  CreateAgroHouseDto,
  CreateAgroHouseBankAccountDto,
} from './dto/create-agro-house.dto';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { CreateAgroHousePaymentDto } from './dto/create-agro-house-payment.dto';
import { CreateAgroHouseAttachmentDto } from './dto/create-agro-house-attachment.dto';
import { CreatePurchaseInvoiceAttachmentDto } from './dto/create-purchase-invoice-attachment.dto';

@UseGuards(JwtAuthGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  // 👉 Casas agrícolas
  @Post('agro-houses')
  createAgroHouse(@Req() req: any, @Body() dto: CreateAgroHouseDto) {
    return this.purchasesService.createAgroHouse(dto, req.scopes, req.user?.role);
  }

  @Get('agro-houses')
  findAllAgroHouses(@Req() req: any) {
    return this.purchasesService.findAllAgroHouses(req.scopes, req.user?.role);
  }

  // 👉 Cuentas bancarias de casa agrícola
  @Post('agro-houses/:id/bank-accounts')
  addBankAccountToAgroHouse(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAgroHouseBankAccountDto,
  ) {
    return this.purchasesService.addBankAccountToAgroHouse(id, dto, req.scopes, req.user?.role);
  }

  @Get('agro-houses/:id/bank-accounts')
  getBankAccountsByAgroHouse(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.purchasesService.getBankAccountsByAgroHouse(id, req.scopes, req.user?.role);
  }

  // 👉 Adjuntos de casa agrícola
  @Post('agro-houses/:id/attachments')
  addAttachmentToAgroHouse(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAgroHouseAttachmentDto,
  ) {
    return this.purchasesService.addAttachmentToAgroHouse(id, dto, req.scopes, req.user?.role);
  }

  @Get('agro-houses/:id/attachments')
  getAttachmentsByAgroHouse(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.purchasesService.getAttachmentsByAgroHouse(id, req.scopes, req.user?.role);
  }

  // 👉 Facturas
  @Post('invoices')
  createPurchaseInvoice(@Req() req: any, @Body() dto: CreatePurchaseInvoiceDto) {
    return this.purchasesService.createPurchaseInvoice(dto, req.scopes, req.user?.role);
  }

  // 👉 Pagos
  @Post('payments')
  createAgroHousePayment(@Req() req: any, @Body() dto: CreateAgroHousePaymentDto) {
    return this.purchasesService.createAgroHousePayment(dto, req.scopes, req.user?.role);
  }

  // 👉 Resumen por ciclo
  @Get('cycles/:cycleId/agro-houses/summary')
  getAgroHousesSummaryByCycle(@Req() req: any, @Param('cycleId', ParseIntPipe) cycleId: number) {
    return this.purchasesService.getAgroHousesSummaryByCycle(cycleId, req.scopes, req.user?.role);
  }

  // 👉 Adjuntos de factura
  @Post('invoices/:id/attachments')
  addAttachmentToPurchaseInvoice(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePurchaseInvoiceAttachmentDto,
  ) {
    return this.purchasesService.addAttachmentToPurchaseInvoice(id, dto, req.scopes, req.user?.role);
  }

  @Get('invoices/:id/attachments')
  getAttachmentsByPurchaseInvoice(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.purchasesService.getAttachmentsByPurchaseInvoice(id, req.scopes, req.user?.role);
  }

  // 👉 Historial
  @Get('agro-houses/:id/history')
  getPurchaseHistoryByAgroHouse(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query('cycleId') cycleId?: string,
  ) {
    const cycleIdNumber = cycleId !== undefined ? Number(cycleId) : undefined;
    return this.purchasesService.getPurchaseHistoryByAgroHouse(
      id,
      Number.isNaN(cycleIdNumber) ? undefined : cycleIdNumber,
      req.scopes,
      req.user?.role,
    );
  }

  // 👉 Estado de cuenta
  @Get('agro-houses/:id/statement')
  getAgroHouseStatement(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query('cycleId') cycleId?: string,
  ) {
    const cycleIdNumber = cycleId !== undefined ? Number(cycleId) : undefined;
    return this.purchasesService.getAgroHouseStatement(
      id,
      Number.isNaN(cycleIdNumber) ? undefined : cycleIdNumber,
      req.scopes,
      req.user?.role,
    );
  }
}
