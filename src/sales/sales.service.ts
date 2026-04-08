// src/sales/sales.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

import { CreateSaleDto } from './dto/create-sale.dto';
import { AddSaleItemDto } from './dto/add-sale-item.dto';
import { ConfirmSaleDto } from './dto/confirm-sale.dto';
import { CreateSalePaymentDto } from './dto/create-sale-payment.dto';
import { UpdateSaleDraftDto } from './dto/update-sale-draft.dto';

import { CodesService } from 'src/codes/codes.service';
import { PricingService } from 'src/settings/pricing/pricing.service';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function toNum(x: any): number {
  if (x === null || x === undefined) return 0;
  if (typeof x === 'object' && typeof x.toNumber === 'function') return x.toNumber();
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function dec(n: number) {
  return new Prisma.Decimal(Number.isFinite(n) ? n : 0);
}

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codesService: CodesService,
    private readonly pricingService: PricingService,
  ) {}

  // ===== LIST =====
  async list(params: {
    from?: string;
    to?: string;
    status?: string;
    partyType?: string;
    clientId?: number;
    producerId?: number;
    company?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Number(params.page || 1));
    const pageSize = Math.min(200, Math.max(1, Number(params.pageSize || 25)));
    const skip = (page - 1) * pageSize;

    const where: Prisma.SaleInvoiceWhereInput = {};

    if (params.status) where.status = params.status as any;
    if (params.partyType) where.partyType = params.partyType as any;
    if (params.clientId) where.clientId = Number(params.clientId);
    if (params.producerId) where.producerId = Number(params.producerId);
    if (params.company) where.company = params.company;

    if (params.from || params.to) {
      where.saleDate = {};
      if (params.from) (where.saleDate as any).gte = new Date(params.from);
      if (params.to) (where.saleDate as any).lte = new Date(params.to);
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { creditNotes: { contains: q, mode: 'insensitive' } },
        { client: { name: { contains: q, mode: 'insensitive' } } },
        { producer: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.saleInvoice.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: pageSize,
        include: { client: true, producer: true, priceList: true },
      }),
      this.prisma.saleInvoice.count({ where }),
    ]);

    return { page, pageSize, total, rows };
  }

  // ===== GET ONE =====
  async getById(id: number) {
    const sale = await this.prisma.saleInvoice.findUnique({
      where: { id },
      include: {
        client: true,
        producer: true,
        priceList: true,
        items: { include: { inventoryItem: true, priceListItem: true } },
        payments: true,
      },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    return sale;
  }

  // ===== CREATE (DRAFT) =====
  async create(dto: CreateSaleDto) {
    const dtoAny = dto as any;

    const partyType = (dtoAny.partyType || 'CLIENT') as any;

    if (partyType === 'CLIENT' && !dtoAny.clientId) {
      throw new BadRequestException('clientId es requerido cuando partyType=CLIENT');
    }
    if (partyType === 'PRODUCER' && !dtoAny.producerId) {
      throw new BadRequestException('producerId es requerido cuando partyType=PRODUCER');
    }

    const saleDate = dtoAny.saleDate ? new Date(dtoAny.saleDate) : new Date();
    const company = dtoAny.companyCode ?? dtoAny.company ?? null;

    let priceListId: number | null = dtoAny.priceListId ?? null;
    if (!priceListId && company) {
      const def = await this.prisma.priceList.findFirst({
        where: { company, isDefault: true, active: true },
        orderBy: { id: 'desc' },
      });
      if (def) priceListId = def.id;
    }

    const documentType = ((dto.documentType as any) || 'FACTURA') as any;
    const code = await this.codesService.nextSaleCode(documentType);

    const applyVat = Boolean(dtoAny.applyVat ?? false);
    const vatRate = Number(dtoAny.vatRate ?? 0);

    const sale = await this.prisma.saleInvoice.create({
      data: {
        code,
        saleDate,
        type: (dtoAny.type as any) || 'LOCAL',
        documentType,
        status: 'DRAFT',
        partyType,
        clientId: dtoAny.clientId ?? null,
        producerId: dtoAny.producerId ?? null,
        isCredit: dtoAny.isCredit ?? false,
        creditNotes: dtoAny.creditNotes ?? null,
        dueDate: dtoAny.dueDate ? new Date(dtoAny.dueDate) : null,
        company,
        currency: (dtoAny.currency as any) || 'USD',
        rateBcv: dtoAny.rateBcv != null ? new Prisma.Decimal(dtoAny.rateBcv) : null,
        applyVat,
        vatRate: new Prisma.Decimal(vatRate),
        vatUsd: new Prisma.Decimal(0),
        notes: dtoAny.notes ?? null,
        priceListId: priceListId ?? null,
      } as any,
    });

    await this.recalcTotalsWithVat(sale.id);
    return this.getById(sale.id);
  }

  // ===== ADD ITEM =====
  async addItem(saleId: number, dto: AddSaleItemDto) {
    const sale = await this.prisma.saleInvoice.findUnique({ where: { id: saleId } });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (sale.status !== 'DRAFT') {
      throw new BadRequestException('Solo puedes agregar items cuando la venta está en DRAFT');
    }

    const inv = await this.prisma.inventoryItem.findUnique({ where: { id: dto.inventoryItemId } });
    if (!inv) throw new NotFoundException('InventoryItem no encontrado');

    const stock = Number(inv.stockQty);
    const reserved = Number(inv.reservedQty);
    const available = stock - reserved;

    if (dto.quantity > available) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${available} ${inv.unit} (stock=${stock}, reservado=${reserved})`,
      );
    }

    if (!sale.priceListId) {
      throw new BadRequestException(
        'La venta no tiene priceListId. Debes seleccionar una lista de precios.',
      );
    }

    const resolved = await this.pricingService.resolveUnitPriceUsd(
      sale.priceListId,
      dto.inventoryItemId,
    );

    const unitPriceUsd = resolved.unitPriceUsd;
    const subtotal = round2(dto.quantity * unitPriceUsd);

    await this.prisma.saleInvoiceItem.create({
      data: {
        saleInvoiceId: saleId,
        inventoryItemId: dto.inventoryItemId,
        description: dto.description ?? null,
        quantity: new Prisma.Decimal(dto.quantity),
        unit: dto.unit ?? inv.unit,
        unitPriceUsd: new Prisma.Decimal(unitPriceUsd),
        subtotalUsd: new Prisma.Decimal(subtotal),
        priceListItemId: resolved.priceListItemId ?? null,
        priceSource: resolved.priceSource,
      },
    });

    await this.recalcTotalsWithVat(saleId);
    return this.getById(saleId);
  }

  // ===== REMOVE ITEM =====
  async removeItem(saleId: number, itemId: number) {
    const sale = await this.prisma.saleInvoice.findUnique({ where: { id: saleId } });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (sale.status !== 'DRAFT') {
      throw new BadRequestException('Solo puedes borrar items cuando la venta está en DRAFT');
    }

    const item = await this.prisma.saleInvoiceItem.findUnique({ where: { id: itemId } });
    if (!item || item.saleInvoiceId !== saleId) {
      throw new NotFoundException('Item no encontrado');
    }

    await this.prisma.saleInvoiceItem.delete({ where: { id: itemId } });
    await this.recalcTotalsWithVat(saleId);
    return this.getById(saleId);
  }

  // ===== UPDATE DRAFT =====
  async updateDraft(saleId: number, dto: UpdateSaleDraftDto) {
    const dtoAny = dto as any;

    const sale = await this.prisma.saleInvoice.findUnique({
      where: { id: saleId },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (sale.status !== 'DRAFT') {
      throw new BadRequestException('Solo puedes editar una venta en DRAFT');
    }

    const company = dtoAny.companyCode ?? dtoAny.company;

    if (dtoAny.priceListId !== undefined) {
      if (dtoAny.priceListId) {
        const exists = await this.prisma.priceList.findUnique({
          where: { id: Number(dtoAny.priceListId) },
          select: { id: true },
        });
        if (!exists) throw new BadRequestException('PriceList no existe');
      }
    }

    const partyType = (dtoAny.partyType as any) ?? sale.partyType;

    if (partyType === 'CLIENT' && dtoAny.clientId === null) {
      throw new BadRequestException('clientId es requerido cuando partyType=CLIENT');
    }
    if (partyType === 'PRODUCER' && dtoAny.producerId === null) {
      throw new BadRequestException('producerId es requerido cuando partyType=PRODUCER');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.saleInvoice.update({
        where: { id: saleId },
        data: {
          saleDate: dtoAny.saleDate ? new Date(dtoAny.saleDate) : undefined,
          type: dtoAny.type != null ? (dtoAny.type as any) : undefined,
          documentType: dtoAny.documentType != null ? (dtoAny.documentType as any) : undefined,
          partyType: dtoAny.partyType != null ? (dtoAny.partyType as any) : undefined,
          clientId: dtoAny.clientId !== undefined ? dtoAny.clientId : undefined,
          producerId: dtoAny.producerId !== undefined ? dtoAny.producerId : undefined,
          isCredit: dtoAny.isCredit !== undefined ? dtoAny.isCredit : undefined,
          creditNotes: dtoAny.creditNotes !== undefined ? dtoAny.creditNotes : undefined,
          dueDate:
            dtoAny.dueDate !== undefined
              ? dtoAny.dueDate ? new Date(dtoAny.dueDate) : null
              : undefined,
          company: company !== undefined ? (company ?? null) : undefined,
          currency: dtoAny.currency != null ? (dtoAny.currency as any) : undefined,
          notes: dtoAny.notes !== undefined ? dtoAny.notes : undefined,
          priceListId: dtoAny.priceListId !== undefined ? (dtoAny.priceListId ?? null) : undefined,
          applyVat: dtoAny.applyVat !== undefined ? Boolean(dtoAny.applyVat) : undefined,
          vatRate: dtoAny.vatRate !== undefined ? new Prisma.Decimal(dtoAny.vatRate ?? 0) : undefined,
          rateBcv:
            dtoAny.rateBcv !== undefined
              ? dtoAny.rateBcv != null && Number(dtoAny.rateBcv) > 0
                ? new Prisma.Decimal(dtoAny.rateBcv)
                : null
              : undefined,
        } as any,
      });

      const incoming = dtoAny.items as
        | Array<{
            id?: number;
            inventoryItemId: number;
            description?: string | null;
            quantity: number;
            unit?: string | null;
            unitPriceUsd?: number;
          }>
        | undefined;

      if (incoming) {
        const incomingIds = incoming.filter((x) => x.id).map((x) => Number(x.id));

        await tx.saleInvoiceItem.deleteMany({
          where: {
            saleInvoiceId: saleId,
            id: { notIn: incomingIds.length ? incomingIds : [-1] },
          },
        });

        for (const it of incoming) {
          const inv = await tx.inventoryItem.findUnique({ where: { id: it.inventoryItemId } });
          if (!inv)
            throw new BadRequestException(`InventoryItem ${it.inventoryItemId} no existe`);

          const available = Number(inv.stockQty) - Number(inv.reservedQty);
          if (Number(it.quantity) > available) {
            throw new BadRequestException(
              `Stock insuficiente para ${inv.code}. Disponible: ${available} ${inv.unit}`,
            );
          }

          let unitPriceUsd: number;
          if (it.unitPriceUsd != null) {
            unitPriceUsd = Number(it.unitPriceUsd);
            if (unitPriceUsd < 0) throw new BadRequestException('unitPriceUsd inválido');
          } else {
            const priceListIdToUse = (dtoAny.priceListId ?? sale.priceListId) as number | null;
            if (!priceListIdToUse) {
              throw new BadRequestException('La venta no tiene priceListId. Selecciona lista de precios.');
            }
            const resolved = await this.pricingService.resolveUnitPriceUsd(priceListIdToUse, it.inventoryItemId);
            unitPriceUsd = resolved.unitPriceUsd;
          }

          const subtotal = round2(Number(it.quantity) * unitPriceUsd);

          if (it.id) {
            await tx.saleInvoiceItem.update({
              where: { id: Number(it.id) },
              data: {
                inventoryItemId: it.inventoryItemId,
                description: it.description ?? null,
                quantity: new Prisma.Decimal(it.quantity),
                unit: it.unit ?? inv.unit,
                unitPriceUsd: new Prisma.Decimal(unitPriceUsd),
                subtotalUsd: new Prisma.Decimal(subtotal),
              },
            });
          } else {
            await tx.saleInvoiceItem.create({
              data: {
                saleInvoiceId: saleId,
                inventoryItemId: it.inventoryItemId,
                description: it.description ?? null,
                quantity: new Prisma.Decimal(it.quantity),
                unit: it.unit ?? inv.unit,
                unitPriceUsd: new Prisma.Decimal(unitPriceUsd),
                subtotalUsd: new Prisma.Decimal(subtotal),
              },
            });
          }
        }
      }

      await this.recalcTotalsWithVatTx(tx, saleId);
      return this.getById(saleId);
    }, { timeout: 30000 });
  }

  // ===== CONFIRM SALE =====
  async confirm(saleId: number, dto: ConfirmSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.saleInvoice.findUnique({
        where: { id: saleId },
        include: { items: true },
      });
      if (!sale) throw new NotFoundException('Venta no encontrada');
      if (sale.status !== 'DRAFT')
        throw new BadRequestException('La venta no está en DRAFT');
      if (!sale.items.length)
        throw new BadRequestException('La venta no tiene items');

      if (sale.currency === 'VES' && (!dto.rateBcv || dto.rateBcv <= 0)) {
        throw new BadRequestException('rateBcv es requerido cuando currency=VES');
      }

      let subtotalUsd = 0;

      for (const it of sale.items) {
        const inv = await tx.inventoryItem.findUnique({ where: { id: it.inventoryItemId } });
        if (!inv)
          throw new BadRequestException(`InventoryItem ${it.inventoryItemId} no existe`);

        const available = Number(inv.stockQty) - Number(inv.reservedQty);
        const qty = Number(it.quantity);

        if (qty > available) {
          throw new BadRequestException(
            `Stock insuficiente al confirmar para item ${inv.code}. Disponible: ${available} ${inv.unit}`,
          );
        }

        const avgCost = Number(inv.avgCostUsd);
        const unitPrice = Number(it.unitPriceUsd);
        const lineSubtotal = round2(qty * unitPrice);
        const costTotal = round2(qty * avgCost);
        const margin = round2(lineSubtotal - costTotal);

        subtotalUsd += lineSubtotal;

        await tx.saleInvoiceItem.update({
          where: { id: it.id },
          data: {
            subtotalUsd: new Prisma.Decimal(lineSubtotal),
            avgCostUsdAtSale: new Prisma.Decimal(avgCost),
            costTotalUsd: new Prisma.Decimal(costTotal),
            marginUsd: new Prisma.Decimal(margin),
          },
        });

        const newStock = round2(Number(inv.stockQty) - qty);
        const newTotalCost = round2(Number(inv.totalCostUsd) - costTotal);

        await tx.inventoryItem.update({
          where: { id: inv.id },
          data: {
            stockQty: new Prisma.Decimal(newStock),
            totalCostUsd: new Prisma.Decimal(newTotalCost),
          },
        });
      }

      subtotalUsd = round2(subtotalUsd);
      const applyVat = Boolean(sale.applyVat);
      const vatRate = Number(sale.vatRate ?? 0);
      const vatUsd = applyVat ? round2(subtotalUsd * (vatRate / 100)) : 0;
      const totalUsd = round2(subtotalUsd + vatUsd);

      const updated = await tx.saleInvoice.update({
        where: { id: saleId },
        data: {
          status: 'CONFIRMED',
          subtotalUsd: new Prisma.Decimal(subtotalUsd),
          vatUsd: new Prisma.Decimal(vatUsd),
          totalUsd: new Prisma.Decimal(totalUsd),
          rateBcv: dto.rateBcv != null ? new Prisma.Decimal(dto.rateBcv) : sale.rateBcv,
          paymentStatus: 'PENDING',
        } as any,
      });

      if (updated.partyType === 'PRODUCER' && updated.producerId && updated.isCredit) {
        const rate = Number(dto.rateBcv || updated.rateBcv || 0);
        await tx.financeMovement.create({
          data: {
            company: updated.company ?? null,
            producerId: updated.producerId,
            cropPlanId: null,
            type: 'SUPPLY_INVOICE',
            amountUsd: totalUsd,
            amountBs: updated.currency === 'VES' && rate > 0 ? round2(totalUsd * rate) : 0,
            rateBcv: updated.currency === 'VES' && rate > 0 ? rate : 0,
            description: `Factura de insumos a crédito (${updated.code || 'SIN-CODIGO'})`,
            status: 'ACTIVE',
            movementDate: updated.saleDate,
            documentType: updated.documentType as any,
            documentNumber: updated.code || null,
            cycle: null,
          },
        });
      }

      return this.getById(saleId);
    }, { timeout: 30000 });
  }

  // ===== CANCEL (DRAFT o CONFIRMED) =====
  async cancel(saleId: number) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.saleInvoice.findUnique({
        where: { id: saleId },
        include: { items: true, payments: true },
      });
      if (!sale) throw new NotFoundException('Venta no encontrada');
      if (sale.status === 'CANCELLED')
        throw new BadRequestException('La venta ya está cancelada');

      // ✅ Si estaba CONFIRMED: devolver stock al inventario
      if (sale.status === 'CONFIRMED') {
        for (const it of sale.items) {
          const qty = Number(it.quantity);

          // ✅ Usar avgCostUsdAtSale si existe, si no unitPriceUsd, si no 0
          const avgCost = toNum(it.avgCostUsdAtSale) || toNum(it.unitPriceUsd) || 0;

          const inv = await tx.inventoryItem.findUnique({ where: { id: it.inventoryItemId } });
          if (!inv) continue;

          const newStock = round2(Number(inv.stockQty) + qty);
          const newTotalCost = round2(Number(inv.totalCostUsd) + qty * avgCost);

          await tx.inventoryItem.update({
            where: { id: inv.id },
            data: {
              stockQty: dec(newStock),
              totalCostUsd: dec(newTotalCost),
            },
          });
        }
      }

      await tx.saleInvoice.update({
        where: { id: saleId },
        data: { status: 'CANCELLED' },
      });

      return this.getById(saleId);
    }, { timeout: 30000 });
  }

  // ===== ADD PAYMENT =====
  async addPayment(saleId: number, dto: CreateSalePaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.saleInvoice.findUnique({
        where: { id: saleId },
        include: { payments: true },
      });
      if (!sale) throw new NotFoundException('Venta no encontrada');
      if (sale.status !== 'CONFIRMED') {
        throw new BadRequestException('Solo puedes registrar pagos cuando la venta está CONFIRMED');
      }

      await tx.salePayment.create({
        data: {
          saleInvoiceId: saleId,
          amountUsd: new Prisma.Decimal((dto as any).amountUsd),
          method: ((dto as any).method as any) || 'TRANSFER',
          reference: (dto as any).reference ?? null,
          notes: (dto as any).notes ?? null,
          adminAccountId: (dto as any).adminAccountId ?? null,
        },
      });

      const payments = await tx.salePayment.findMany({ where: { saleInvoiceId: saleId } });
      const paid = payments.reduce((acc, p) => acc + Number(p.amountUsd), 0);
      const total = Number(sale.totalUsd);

      let paymentStatus: any = 'PENDING';
      if (paid >= total) paymentStatus = 'PAID';
      else if (paid > 0) paymentStatus = 'PARTIAL';

      await tx.saleInvoice.update({
        where: { id: saleId },
        data: { paymentStatus },
      });

      return this.getById(saleId);
    }, { timeout: 30000 });
  }

  // ===== REPORTS =====
  async getReport(params: { from?: string; to?: string; company?: string }) {
    const where: Prisma.SaleInvoiceWhereInput = { status: 'CONFIRMED' };

    if (params.company) where.company = params.company;
    if (params.from || params.to) {
      where.saleDate = {};
      if (params.from) (where.saleDate as any).gte = new Date(params.from);
      if (params.to) (where.saleDate as any).lte = new Date(params.to);
    }

    const invoices = await this.prisma.saleInvoice.findMany({
      where,
      include: { items: true, payments: true, client: true, producer: true },
    });

    const totalVentasUsd = round2(invoices.reduce((acc, s) => acc + Number(s.totalUsd), 0));
    const totalCobradoUsd = round2(
      invoices.reduce((acc, s) => acc + s.payments.reduce((a, p) => a + Number(p.amountUsd), 0), 0),
    );
    const totalPendienteUsd = round2(totalVentasUsd - totalCobradoUsd);
    const totalMargenUsd = round2(
      invoices.reduce((acc, s) => acc + s.items.reduce((a, it) => a + Number(it.marginUsd ?? 0), 0), 0),
    );

    const porEstadoPago = {
      PAID: invoices.filter((s) => s.paymentStatus === 'PAID').length,
      PARTIAL: invoices.filter((s) => s.paymentStatus === 'PARTIAL').length,
      PENDING: invoices.filter((s) => s.paymentStatus === 'PENDING').length,
    };

    const clientMap: Record<string, { name: string; totalUsd: number }> = {};
    for (const s of invoices) {
      if (s.partyType !== 'CLIENT' || !s.clientId) continue;
      const key = String(s.clientId);
      if (!clientMap[key]) clientMap[key] = { name: s.client?.name ?? 'Sin nombre', totalUsd: 0 };
      clientMap[key].totalUsd = round2(clientMap[key].totalUsd + Number(s.totalUsd));
    }
    const topClientes = Object.values(clientMap)
      .sort((a, b) => b.totalUsd - a.totalUsd)
      .slice(0, 5);

    const porMes: Record<string, number> = {};
    for (const s of invoices) {
      const key = s.saleDate.toISOString().slice(0, 7);
      porMes[key] = round2((porMes[key] ?? 0) + Number(s.totalUsd));
    }
    const ventasPorMes = Object.entries(porMes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, totalUsd]) => ({ mes, totalUsd }));

    return {
      totalFacturas: invoices.length,
      totalVentasUsd,
      totalCobradoUsd,
      totalPendienteUsd,
      totalMargenUsd,
      porEstadoPago,
      topClientes,
      ventasPorMes,
    };
  }

  // ===== PRIVATE: recalcular totales =====
  private async recalcTotalsWithVat(saleId: number) {
    return this.prisma.$transaction(async (tx) => {
      await this.recalcTotalsWithVatTx(tx, saleId);
    }, { timeout: 30000 });
  }

  private async recalcTotalsWithVatTx(tx: any, saleId: number) {
    const sale = await tx.saleInvoice.findUnique({
      where: { id: saleId },
      select: { id: true, applyVat: true, vatRate: true, currency: true, rateBcv: true },
    });

    const items = await tx.saleInvoiceItem.findMany({
      where: { saleInvoiceId: saleId },
      select: { subtotalUsd: true },
    });

    const subtotalUsd = round2(items.reduce((acc, it) => acc + toNum(it.subtotalUsd), 0));
    const applyVat = Boolean(sale?.applyVat);
    const vatRate = toNum(sale?.vatRate);
    const vatUsd = applyVat ? round2(subtotalUsd * (vatRate / 100)) : 0;
    const totalUsd = round2(subtotalUsd + vatUsd);

    const currency = sale?.currency as any;
    const rate = toNum(sale?.rateBcv);

    let subtotalBs = 0;
    let vatBs = 0;
    let totalBs = 0;

    if (currency === 'VES' && rate > 0) {
      subtotalBs = round2(subtotalUsd * rate);
      vatBs = round2(vatUsd * rate);
      totalBs = round2(totalUsd * rate);
    }

    await tx.saleInvoice.update({
      where: { id: saleId },
      data: {
        subtotalUsd: dec(subtotalUsd),
        vatUsd: dec(vatUsd),
        totalUsd: dec(totalUsd),
        subtotalBs: dec(subtotalBs),
        vatBs: dec(vatBs),
        totalBs: dec(totalBs),
      },
    });
  }

  // ===== SET PRICE LIST =====
  async setPriceList(saleId: number, priceListId: number | null) {
    const sale = await this.prisma.saleInvoice.findUnique({
      where: { id: saleId },
      select: { id: true, status: true },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (sale.status !== 'DRAFT') {
      throw new BadRequestException('Solo puedes cambiar la lista de precios en DRAFT');
    }

    if (priceListId) {
      const exists = await this.prisma.priceList.findUnique({
        where: { id: priceListId },
        select: { id: true },
      });
      if (!exists) throw new BadRequestException('PriceList no existe');
    }

    await this.prisma.saleInvoice.update({
      where: { id: saleId },
      data: { priceListId: priceListId ?? null },
    });

    return this.getById(saleId);
  }
}