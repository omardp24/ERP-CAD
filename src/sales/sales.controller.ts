// src/sales/sales.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { SalesService } from './sales.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

import { CreateSaleDto } from './dto/create-sale.dto';
import { AddSaleItemDto } from './dto/add-sale-item.dto';
import { ConfirmSaleDto } from './dto/confirm-sale.dto';
import { CreateSalePaymentDto } from './dto/create-sale-payment.dto';
import { SetSalePriceListDto } from './dto/set-sale-price-list.dto';
import { UpdateSaleDraftDto } from './dto/update-sale-draft.dto';

@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // ===== REPORT (debe ir ANTES de :id para que NestJS no lo confunda) =====
  @Get('report/summary')
  async report(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('company') company?: string,
  ) {
    return this.salesService.getReport({ from, to, company });
  }

  // ===== LIST =====
  @Get()
  async list(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('partyType') partyType?: string,
    @Query('clientId') clientId?: string,
    @Query('producerId') producerId?: string,
    @Query('company') company?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.salesService.list({
      from,
      to,
      status,
      partyType,
      clientId: clientId ? Number(clientId) : undefined,
      producerId: producerId ? Number(producerId) : undefined,
      company,
      search,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 25,
    });
  }

  // ===== GET ONE =====
  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.getById(id);
  }

  // ===== CREATE (DRAFT) =====
  @Post()
  async create(@Body() dto: CreateSaleDto) {
    return this.salesService.create(dto);
  }

  // ===== UPDATE DRAFT =====
  @Patch(':id/draft')
  async updateDraft(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSaleDraftDto,
  ) {
    return this.salesService.updateDraft(id, dto);
  }

  // ===== SET PRICE LIST =====
  @Patch(':id/price-list')
  async setPriceList(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetSalePriceListDto,
  ) {
    return this.salesService.setPriceList(id, dto.priceListId ?? null);
  }

  // ===== ADD ITEM =====
  @Post(':id/items')
  async addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddSaleItemDto,
  ) {
    return this.salesService.addItem(id, dto);
  }

  // ===== REMOVE ITEM =====
  @Delete(':id/items/:itemId')
  async removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.salesService.removeItem(id, itemId);
  }

  // ===== CONFIRM =====
  @Post(':id/confirm')
  async confirm(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmSaleDto,
  ) {
    return this.salesService.confirm(id, dto);
  }

  // ===== CANCEL (DRAFT o CONFIRMED) =====
  @Post(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.cancel(id);
  }

  // ===== ADD PAYMENT =====
  @Post(':id/payments')
  async addPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSalePaymentDto,
  ) {
    return this.salesService.addPayment(id, dto);
  }
}