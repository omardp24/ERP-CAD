// src/inventory/inventory.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInitialEntryDto } from './dto/create-initial-entry.dto';
import { CreateInternalConsumptionDto } from './dto/create-internal-consumption.dto';

type ListMovementsQuery = {
  from?: string;
  to?: string;
  movementType?: string;
  module?: string;
  warehouseId?: number;
  inventoryItemId?: number;
  productId?: number;
  search?: string;
  page: number;
  pageSize: number;
};

type ManualMovementDto = {
  productId: number;
  warehouseId?: number | null;
  movementType: 'IN' | 'OUT';
  quantity: number;
  unitCostUsd?: number | null;
  note?: string | null;
};

type StockAdjustDto = {
  inventoryItemId: number;
  newQty: number;
  reason?: string | null;
};

type RequestScopes = {
  warehouseIds: number[] | null;
  producerIds: number[] | null;
  companies: string[] | null;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // Helpers
  // =========================================================
  private applyWarehouseScopeToWhere(where: any, scopes?: RequestScopes, role?: string) {
    if (role === 'ADMIN') return where;
    if (!scopes?.warehouseIds) return where;

    const allowed = scopes.warehouseIds;

    if (typeof where.warehouse_id === 'number') {
      if (!allowed.includes(where.warehouse_id)) {
        where.warehouse_id = { in: [] as number[] };
      }
      return where;
    }

    if (where.warehouse_id?.in && Array.isArray(where.warehouse_id.in)) {
      where.warehouse_id = {
        in: where.warehouse_id.in.filter((x: number) => allowed.includes(x)),
      };
      return where;
    }

    where.warehouse_id = { in: allowed };
    return where;
  }

  private async getOrCreateInventoryItemByProductId(
    productId: number,
    company: 'CAD' | 'SILO_AMAZO' = 'CAD',
  ) {
    const product = await this.prisma.products.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const inventoryCode = String(product.id);
    const category = (product.category as any) ?? 'INSUMO';
    const unit = product.unit ?? 'kg';

    let inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: { code: inventoryCode },
    });

    if (!inventoryItem) {
      inventoryItem = await this.prisma.inventoryItem.create({
        data: {
          code: inventoryCode,
          name: product.name ?? `Producto ${product.id}`,
          category,
          unit,
          company,
          stockQty: 0,
          reservedQty: 0,
          avgCostUsd: 0,
          totalCostUsd: 0,
        },
      });
    }

    return { product, inventoryItem };
  }

  private ensurePositive(n: number, message: string) {
    if (!Number.isFinite(n) || n <= 0) throw new BadRequestException(message);
  }

  private normalizeSignedQty(movementType: string | null | undefined, rawQty: any) {
    const qty = Number(rawQty ?? 0);
    if (!Number.isFinite(qty)) return 0;
    if (!movementType) return Math.abs(qty);
    if (movementType === 'OUT') return -Math.abs(qty);
    return Math.abs(qty);
  }

  private parseDateOnly(value?: string) {
    if (!value) return null;
    const s = String(value).trim();
    if (!s) return null;
    const [y, m, d] = s.split('-').map((x) => Number(x));
    if (!y || !m || !d) return null;
    return { y, m, d };
  }

  private buildDateRange(from?: string, to?: string) {
    const fromParts = this.parseDateOnly(from);
    const toParts = this.parseDateOnly(to);
    if (!fromParts && !toParts) return undefined;

    const range: any = {};
    if (fromParts) range.gte = new Date(fromParts.y, fromParts.m - 1, fromParts.d, 0, 0, 0, 0);
    if (toParts) range.lte = new Date(toParts.y, toParts.m - 1, toParts.d, 23, 59, 59, 999);
    return range;
  }

  // =========================================================
  // LISTA INVENTARIO PARA VENTAS (autocomplete)
  // =========================================================
  async listItemsForSales(opts: { search: string; take: number }) {
    const search = (opts.search || '').trim();
    const take = Math.min(Number(opts.take || 20), 50);

    const where: any = {};
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.inventoryItem.findMany({
      where,
      take,
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, unit: true, stockQty: true, avgCostUsd: true },
    });
  }

  // =========================================================
  // LISTA INVENTARIO GENERAL
  // =========================================================
  async listItems() {
    const rows = await this.prisma.inventoryItem.findMany({ orderBy: { code: 'asc' } });

    return rows.map((row) => {
      const totalQty = Number(row.stockQty ?? 0);
      const reservedQty = Number(row.reservedQty ?? 0);
      const availableQty = totalQty - reservedQty;
      const avgCostUsd = Number(row.avgCostUsd ?? 0);
      const totalCostUsd = row.totalCostUsd ? Number(row.totalCostUsd) : availableQty * avgCostUsd;

      return {
        id: row.id,
        code: row.code,
        name: row.name,
        category: row.category,
        unit: row.unit,
        stockQty: totalQty,
        totalQty,
        reservedQty,
        availableQty,
        avgCostUsd,
        totalCostUsd,
        company: row.company,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
  }

  // =========================================================
  // REPORTE DE INVENTARIO
  // =========================================================
  async getReport(params: { company?: string; category?: string }) {
    const where: any = {};
    if (params.company) where.company = params.company;
    if (params.category) where.category = params.category;

    const rows = await this.prisma.inventoryItem.findMany({ where });

    const totalItems = rows.length;
    const totalStockUsd = rows.reduce(
      (acc, r) => acc + Number(r.totalCostUsd ?? 0),
      0,
    );
    const itemsSinStock = rows.filter((r) => Number(r.stockQty ?? 0) <= 0).length;
    const itemsConStock = totalItems - itemsSinStock;

    // Por categoría
    const porCategoria: Record<string, { items: number; stockUsd: number }> = {};
    for (const r of rows) {
      const cat = r.category ?? 'SIN_CATEGORIA';
      if (!porCategoria[cat]) porCategoria[cat] = { items: 0, stockUsd: 0 };
      porCategoria[cat].items++;
      porCategoria[cat].stockUsd = Math.round(
        (porCategoria[cat].stockUsd + Number(r.totalCostUsd ?? 0)) * 100,
      ) / 100;
    }

    // Top 10 items por valor
    const topPorValor = rows
      .map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        unit: r.unit,
        stockQty: Number(r.stockQty ?? 0),
        avgCostUsd: Number(r.avgCostUsd ?? 0),
        totalCostUsd: Number(r.totalCostUsd ?? 0),
      }))
      .sort((a, b) => b.totalCostUsd - a.totalCostUsd)
      .slice(0, 10);

    return {
      totalItems,
      itemsConStock,
      itemsSinStock,
      totalStockUsd: Math.round(totalStockUsd * 100) / 100,
      porCategoria,
      topPorValor,
    };
  }

  // =========================================================
  // ALERTAS DE STOCK BAJO
  // =========================================================
  async getStockAlerts(params: { minQty?: number; company?: string }) {
    const minQty = Number(params.minQty ?? 0);
    const where: any = {};
    if (params.company) where.company = params.company;

    const rows = await this.prisma.inventoryItem.findMany({
      where,
      orderBy: { stockQty: 'asc' },
    });

    const alerts = rows
      .map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        category: r.category,
        unit: r.unit,
        stockQty: Number(r.stockQty ?? 0),
        reservedQty: Number(r.reservedQty ?? 0),
        availableQty: Number(r.stockQty ?? 0) - Number(r.reservedQty ?? 0),
        avgCostUsd: Number(r.avgCostUsd ?? 0),
        company: r.company,
      }))
      .filter((r) => r.stockQty <= minQty);

    return {
      total: alerts.length,
      minQtyUsed: minQty,
      alerts,
    };
  }

  // =========================================================
  // AJUSTE DE STOCK
  // =========================================================
  async adjustStock(dto: StockAdjustDto) {
    const { inventoryItemId, newQty, reason } = dto;

    if (!Number.isFinite(newQty) || newQty < 0) {
      throw new BadRequestException('La nueva cantidad debe ser un número mayor o igual a cero.');
    }

    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    });
    if (!item) throw new NotFoundException('Ítem de inventario no encontrado');

    const prevQty = Number(item.stockQty ?? 0);
    const avgCost = Number(item.avgCostUsd ?? 0);
    const diff = newQty - prevQty;

    if (diff === 0) {
      return { ok: true, message: 'Sin cambios. La cantidad ya era la misma.' };
    }

    const newTotalCost = Math.round(newQty * avgCost * 100) / 100;
    const movementType = diff > 0 ? 'IN' : 'OUT';

    // Actualizar inventario
    await this.prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: {
        stockQty: newQty,
        totalCostUsd: newTotalCost,
      },
    });

    // Registrar movimiento de ajuste
    await this.prisma.inventory_movements.create({
      data: {
        lot_id: null,
        warehouse_id: null,
        movement_type: movementType as any,
        quantity: Math.abs(diff),
        cost: avgCost,
        module: 'ADJUST',
        reference_id: inventoryItemId,
        notes: reason ?? `Ajuste de stock: ${prevQty} → ${newQty}`,
      },
    });

    return {
      ok: true,
      message: `Stock ajustado de ${prevQty} a ${newQty} ${item.unit}.`,
      prev: prevQty,
      next: newQty,
      diff,
      movementType,
    };
  }

  // =========================================================
  // HISTORIAL MOVIMIENTOS POR ITEM
  // =========================================================
  async getItemMovements(inventoryItemId: number, scopes?: RequestScopes, role?: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    });
    if (!item) throw new NotFoundException('Ítem de inventario no encontrado');

    const where: any = { reference_id: inventoryItemId };
    this.applyWarehouseScopeToWhere(where, scopes, role);

    const moves = await this.prisma.inventory_movements.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { warehouses: true },
    });

    return moves.map((m) => {
      const signedQty = this.normalizeSignedQty((m as any).movement_type ?? null, m.quantity);
      const cost = Number(m.cost ?? 0);

      return {
        id: m.id,
        movementType: (m as any).movement_type ?? null,
        quantity: signedQty,
        cost,
        totalCost: signedQty * cost,
        module: m.module,
        date: m.date,
        notes: m.notes,
        warehouseId: m.warehouse_id,
        warehouseName: m.warehouses?.name ?? null,
      };
    });
  }

  // =========================================================
  // CONSUMO INTERNO
  // =========================================================
  async registerInternalConsumption(dto: CreateInternalConsumptionDto) {
    const { productId, inventoryItemId, quantity, warehouseId, note } = dto;
    this.ensurePositive(quantity, 'La cantidad a consumir debe ser mayor a cero.');

    let item = null as any;

    if (inventoryItemId) {
      item = await this.prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
    } else if (productId) {
      const { inventoryItem } = await this.getOrCreateInventoryItemByProductId(Number(productId));
      item = inventoryItem;
    }

    if (!item) {
      throw new BadRequestException('No existe un ítem de inventario asociado a este producto.');
    }

    const available = Number(item.stockQty ?? 0);
    if (available < quantity) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${available}, solicitado: ${quantity}.`,
      );
    }

    const avgCost = Number(item.avgCostUsd ?? 0);
    const signedQty = -Math.abs(quantity);
    const valueToDecrement = Math.abs(signedQty) * avgCost;

    await this.prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        stockQty: { decrement: Math.abs(signedQty) },
        totalCostUsd: { decrement: valueToDecrement },
      },
    });

    await this.prisma.inventory_movements.create({
      data: {
        lot_id: null,
        warehouse_id: warehouseId ?? null,
        movement_type: 'OUT' as any,
        quantity: signedQty,
        cost: avgCost,
        module: 'CONSUMO_INTERNO',
        reference_id: item.id,
        notes: note ?? null,
      },
    });

    return { ok: true, message: 'Consumo interno registrado correctamente.' };
  }

  // =========================================================
  // NOTA MANUAL (IN/OUT)
  // =========================================================
  async createManualMovement(dto: ManualMovementDto) {
    const { productId, warehouseId, movementType, quantity, unitCostUsd, note } = dto;

    if (!productId) throw new BadRequestException('productId es requerido');
    this.ensurePositive(quantity, 'La cantidad debe ser mayor a cero.');

    const { inventoryItem } = await this.getOrCreateInventoryItemByProductId(Number(productId));

    const prevStock = Number(inventoryItem.stockQty ?? 0);
    const prevAvg = Number(inventoryItem.avgCostUsd ?? 0);
    const signedQty = movementType === 'OUT' ? -Math.abs(quantity) : Math.abs(quantity);

    if (movementType === 'OUT') {
      if (prevStock < Math.abs(signedQty)) {
        throw new BadRequestException(
          `Stock insuficiente. Disponible: ${prevStock}, solicitado: ${Math.abs(signedQty)}.`,
        );
      }

      const costToUse = Number(unitCostUsd ?? prevAvg ?? 0);
      const decrementValue = Math.abs(signedQty) * costToUse;

      await this.prisma.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          stockQty: { decrement: Math.abs(signedQty) },
          totalCostUsd: { decrement: decrementValue },
        },
      });

      await this.prisma.inventory_movements.create({
        data: {
          lot_id: null,
          warehouse_id: warehouseId ?? null,
          movement_type: 'OUT' as any,
          quantity: signedQty,
          cost: costToUse,
          module: 'MANUAL',
          reference_id: inventoryItem.id,
          notes: note ?? 'Nota manual (salida)',
        },
      });

      return { ok: true, message: 'Nota manual de salida registrada.' };
    }

    // IN
    const incomingCost = Number(unitCostUsd ?? 0);
    if (incomingCost < 0) throw new BadRequestException('El costo no puede ser negativo');

    const newStock = prevStock + Math.abs(signedQty);
    const newAvg = newStock <= 0 ? 0 : (prevStock * prevAvg + Math.abs(signedQty) * incomingCost) / newStock;
    const newTotal = newStock * newAvg;

    await this.prisma.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: { stockQty: newStock, avgCostUsd: newAvg, totalCostUsd: newTotal },
    });

    await this.prisma.inventory_movements.create({
      data: {
        lot_id: null,
        warehouse_id: warehouseId ?? null,
        movement_type: 'IN' as any,
        quantity: Math.abs(signedQty),
        cost: incomingCost,
        module: 'MANUAL',
        reference_id: inventoryItem.id,
        notes: note ?? 'Nota manual (entrada)',
      },
    });

    return { ok: true, message: 'Nota manual de entrada registrada.' };
  }

  // =========================================================
  // APLICAR PURCHASE ITEM (IN)
  // =========================================================
  async applyPurchaseItemToInventory(purchaseItemId: number, warehouseId?: number) {
    const purchaseItem = await this.prisma.purchaseItem.findUnique({
      where: { id: purchaseItemId },
      include: { product: true, purchaseInvoice: true },
    });

    if (!purchaseItem) throw new NotFoundException('PurchaseItem no encontrado');
    if (!purchaseItem.product) {
      throw new BadRequestException('La línea de compra no tiene producto asociado.');
    }

    const product = purchaseItem.product;
    const inventoryCode = String(product.id);

    let inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: { code: inventoryCode },
    });

    if (!inventoryItem) {
      inventoryItem = await this.prisma.inventoryItem.create({
        data: {
          code: inventoryCode,
          name: product.name ?? purchaseItem.description,
          category: (product.category as any) ?? 'INSUMO',
          unit: purchaseItem.unit ?? product.unit ?? 'kg',
          company: 'CAD',
          stockQty: 0,
          reservedQty: 0,
          avgCostUsd: 0,
          totalCostUsd: 0,
        },
      });
    }

    const prevStock = Number(inventoryItem.stockQty ?? 0);
    const prevAvg = Number(inventoryItem.avgCostUsd ?? 0);
    const qty = Number(purchaseItem.quantity ?? 0);
    const unitCost = Number(purchaseItem.unitPrice ?? 0);

    if (qty <= 0) throw new BadRequestException('La cantidad de compra debe ser mayor a cero.');

    const newStock = prevStock + qty;
    const newAvg = newStock <= 0 ? 0 : (prevStock * prevAvg + qty * unitCost) / newStock;
    const newTotal = newStock * newAvg;

    const updatedInventoryItem = await this.prisma.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: { stockQty: newStock, avgCostUsd: newAvg, totalCostUsd: newTotal },
    });

    await this.prisma.inventory_movements.create({
      data: {
        lot_id: null,
        warehouse_id: warehouseId ?? null,
        movement_type: 'IN' as any,
        quantity: Math.abs(qty),
        cost: unitCost,
        module: 'PURCHASE',
        reference_id: updatedInventoryItem.id,
        notes: `Compra factura ${purchaseItem.purchaseInvoice?.invoiceNumber ?? ''} (item ${purchaseItem.id})`,
      },
    });

    return updatedInventoryItem;
  }

  // =========================================================
  // APLICAR FACTURA COMPLETA
  // =========================================================
  async applyInvoiceToInventory(invoiceId: number, warehouseId?: number) {
    const invoice = await this.prisma.purchaseInvoice.findUnique({
      where: { id: invoiceId },
      include: { items: { include: { product: true } } },
    });

    if (!invoice) throw new NotFoundException('Factura de compra no encontrada');
    if (!invoice.items || invoice.items.length === 0) {
      throw new BadRequestException('La factura no tiene items de compra registrados.');
    }

    const mappings: { purchaseItemId: number; inventoryItemId: number }[] = [];

    for (const item of invoice.items) {
      const updated = await this.applyPurchaseItemToInventory(item.id, warehouseId);
      mappings.push({ purchaseItemId: item.id, inventoryItemId: updated.id });
    }

    return { invoiceId, itemsApplied: invoice.items.length, mappings };
  }

  // =========================================================
  // INVENTARIO INICIAL
  // =========================================================
  async createInitialEntry(dto: CreateInitialEntryDto) {
    this.ensurePositive(dto.quantity, 'La cantidad inicial debe ser mayor a cero.');

    const { inventoryItem } = await this.getOrCreateInventoryItemByProductId(
      Number(dto.productId),
      (dto.company as any) ?? 'CAD',
    );

    const prevStock = Number(inventoryItem.stockQty ?? 0);
    const prevAvg = Number(inventoryItem.avgCostUsd ?? 0);
    const qty = Number(dto.quantity);
    const unitCost = Number(dto.unitCostUsd ?? 0);

    const newStock = prevStock + qty;
    const newAvg = newStock <= 0 ? 0 : (prevStock * prevAvg + qty * unitCost) / newStock;
    const newTotal = newStock * newAvg;

    await this.prisma.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: { stockQty: newStock, avgCostUsd: newAvg, totalCostUsd: newTotal },
    });

    await this.prisma.inventory_movements.create({
      data: {
        lot_id: null,
        warehouse_id: dto.warehouseId ?? null,
        movement_type: 'IN' as any,
        quantity: Math.abs(qty),
        cost: unitCost,
        module: 'INITIAL',
        reference_id: inventoryItem.id,
        notes: 'Inventario inicial',
      },
    });

    return { ok: true, message: 'Inventario inicial registrado.' };
  }

  // =========================================================
  // LISTADO GLOBAL DE MOVIMIENTOS
  // =========================================================
  async listMovements(q: ListMovementsQuery, scopes?: RequestScopes, role?: string) {
    const { from, to, movementType, module, warehouseId, inventoryItemId, productId, search, page, pageSize } = q;

    let resolvedInventoryItemId = inventoryItemId;

    if (!resolvedInventoryItemId && productId && !warehouseId && !movementType && !module) {
      const invItem = await this.prisma.inventoryItem.findUnique({
        where: { code: String(productId) },
      });
      resolvedInventoryItemId = invItem?.id;
    }

    const where: any = {};

    if (warehouseId) where.warehouse_id = warehouseId;
    if (resolvedInventoryItemId) where.reference_id = resolvedInventoryItemId;
    if (movementType && movementType !== 'ALL') where.movement_type = movementType;
    if (module && module !== 'ALL') where.module = module;

    const dateRange = this.buildDateRange(from, to);
    if (dateRange) where.date = dateRange;

    if (search && search.trim()) {
      where.notes = { contains: search.trim(), mode: 'insensitive' };
    }

    this.applyWarehouseScopeToWhere(where, scopes, role);

    const total = await this.prisma.inventory_movements.count({ where });

    const rows = await this.prisma.inventory_movements.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { warehouses: true },
    });

    const refIds = Array.from(
      new Set(rows.map((r) => r.reference_id).filter((x) => typeof x === 'number')),
    ) as number[];

    const invItems = refIds.length
      ? await this.prisma.inventoryItem.findMany({ where: { id: { in: refIds } } })
      : [];

    const invMap = new Map(invItems.map((i) => [i.id, i]));

    const items = rows.map((m) => {
      const inv = m.reference_id ? invMap.get(m.reference_id) : null;
      const signedQty = this.normalizeSignedQty((m as any).movement_type ?? null, m.quantity);
      const cost = Number(m.cost ?? 0);

      return {
        id: m.id,
        date: m.date,
        movementType: (m as any).movement_type ?? null,
        module: m.module,
        quantity: signedQty,
        cost,
        totalCost: signedQty * cost,
        notes: m.notes,
        warehouseId: m.warehouse_id,
        warehouseName: m.warehouses?.name ?? null,
        inventoryItemId: m.reference_id ?? null,
        itemCode: inv?.code ?? null,
        itemName: inv?.name ?? null,
        itemUnit: inv?.unit ?? null,
        itemCategory: inv?.category ?? null,
      };
    });

    return { items, meta: { page, pageSize, total } };
  }
}