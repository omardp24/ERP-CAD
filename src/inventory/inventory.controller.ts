// src/inventory/inventory.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInitialEntryDto } from './dto/create-initial-entry.dto';
import { CreateInternalConsumptionDto } from './dto/create-internal-consumption.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('inventories')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ===== REPORTE (debe ir ANTES de :id) =====
  @Get('report/summary')
  async getReport(
    @Query('company') company?: string,
    @Query('category') category?: string,
  ) {
    return this.inventoryService.getReport({ company, category });
  }

  // ===== ALERTAS DE STOCK BAJO =====
  @Get('alerts/low-stock')
  async getLowStockAlerts(
    @Query('minQty') minQty?: string,
    @Query('company') company?: string,
  ) {
    return this.inventoryService.getStockAlerts({
      minQty: minQty ? Number(minQty) : 0,
      company,
    });
  }

  // ===== LISTA INVENTARIO GENERAL =====
  @Get()
  async getAll() {
    return this.inventoryService.listItems();
  }

  // ===== LISTA PARA VENTAS (autocomplete) =====
  @Get('items')
  async listItems(
    @Query('search') search?: string,
    @Query('take') take?: string,
  ) {
    return this.inventoryService.listItemsForSales({
      search: search?.trim() || '',
      take: Math.min(Number(take || 20), 50),
    });
  }

  // ===== MOVIMIENTOS GLOBALES =====
  @Get('movements')
  async listMovements(@Req() req: any, @Query() query: any) {
    const toInt = (v: any): number | undefined => {
      if (v === undefined || v === null) return undefined;
      const s = String(v).trim();
      if (!s || s === 'undefined' || s === 'null') return undefined;
      const n = Number(s);
      if (!Number.isFinite(n) || n <= 0) return undefined;
      return n;
    };

    const toStr = (v: any): string | undefined => {
      if (v === undefined || v === null) return undefined;
      const s = String(v).trim();
      if (!s || s === 'undefined' || s === 'null') return undefined;
      return s;
    };

    const normalizeAll = (v: any): string | undefined => {
      const s = toStr(v);
      if (!s) return undefined;
      const up = s.toUpperCase();
      if (up === 'ALL' || up === 'TODOS' || up === 'TODO') return 'ALL';
      return s;
    };

    const from = toStr(query.from);
    const to = toStr(query.to);
    const movementType = normalizeAll(query.movementType);
    const module = normalizeAll(query.module);
    const warehouseId = toInt(query.warehouseId);
    const inventoryItemId = toInt(query.inventoryItemId);
    const productId = toInt(query.productId);
    const search = toStr(query.search);

    const pageRaw = toInt(query.page);
    const pageSizeRaw = toInt(query.pageSize);
    const page = pageRaw ? Math.max(1, pageRaw) : 1;
    const pageSize = pageSizeRaw ? Math.min(100, Math.max(5, pageSizeRaw)) : 25;

    return this.inventoryService.listMovements(
      {
        from,
        to,
        movementType: movementType === 'ALL' ? undefined : movementType,
        module: module === 'ALL' ? undefined : module,
        warehouseId,
        inventoryItemId,
        productId,
        search,
        page,
        pageSize,
      },
      req.scopes,
      req.user?.role,
    );
  }

  // ===== MOVIMIENTOS POR ITEM =====
  @Get(':id/movements')
  async getItemMovements(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.getItemMovements(id, req.scopes, req.user?.role);
  }

  // ===== AJUSTE DE STOCK =====
  @Post('adjust-stock')
  async adjustStock(@Body() dto: any) {
    return this.inventoryService.adjustStock({
      inventoryItemId: Number(dto.inventoryItemId),
      newQty: Number(dto.newQty),
      reason: dto.reason ?? null,
    });
  }

  // ===== CONSUMO INTERNO =====
  @Post('internal-consumption')
  async registerInternalConsumption(@Body() dto: CreateInternalConsumptionDto) {
    return this.inventoryService.registerInternalConsumption(dto);
  }

  // ===== NOTA MANUAL =====
  @Post('manual-movement')
  async createManualMovement(@Body() dto: any) {
    return this.inventoryService.createManualMovement(dto);
  }

  // ===== APLICAR PURCHASE ITEM =====
  @Post('apply-purchase-item/:id')
  async applyPurchaseItem(
    @Param('id', ParseIntPipe) id: number,
    @Body('warehouseId') warehouseIdRaw?: any,
  ) {
    const warehouseId =
      warehouseIdRaw !== undefined && warehouseIdRaw !== null
        ? Number(warehouseIdRaw)
        : undefined;
    return this.inventoryService.applyPurchaseItemToInventory(id, warehouseId);
  }

  // ===== APLICAR FACTURA COMPLETA =====
  @Post('apply-invoice/:invoiceId')
  async applyInvoice(
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
    @Body('warehouseId') warehouseIdRaw?: any,
  ) {
    const warehouseId =
      warehouseIdRaw !== undefined && warehouseIdRaw !== null
        ? Number(warehouseIdRaw)
        : undefined;
    return this.inventoryService.applyInvoiceToInventory(invoiceId, warehouseId);
  }

  // ===== INVENTARIO INICIAL =====
  @Post('initial-entry')
  async createInitialEntry(@Body() dto: CreateInitialEntryDto) {
    return this.inventoryService.createInitialEntry(dto);
  }
}