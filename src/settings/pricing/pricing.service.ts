import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpsertPriceListItemDto } from './dto/upsert-price-list-item.dto';
import { Prisma, PriceItemMode } from '@prisma/client';

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

function slugCode(input: string) {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function autoCode(company: string) {
  const stamp = Date.now().toString(36).toUpperCase();
  return `PL_${company}_${stamp}`.slice(0, 40);
}

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================
  // ===== PRICE LISTS =======
  // =========================

  async listPriceLists(company?: string) {
    return this.prisma.priceList.findMany({
      where: {
        active: true,
        ...(company ? { company } : {}),
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: { items: false },
    });
  }

  async getPriceList(id: number) {
    const pl = await this.prisma.priceList.findUnique({
      where: { id },
      include: {
        items: {
          include: { inventoryItem: true },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!pl) throw new NotFoundException('PriceList no encontrada');
    return pl;
  }

  async createPriceList(dto: CreatePriceListDto) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('name requerido');

    const company = dto.company ?? 'CAD';

    // ✅ code SIEMPRE string
    const code = dto.code?.trim() ? slugCode(dto.code) : autoCode(company);

    return this.prisma.$transaction(async (tx) => {
      // si viene isDefault=true, apaga otros defaults de la misma company
      if (dto.isDefault) {
        await tx.priceList.updateMany({
          where: { company },
          data: { isDefault: false },
        });
      }

      return tx.priceList.create({
        data: {
          code,
          name,
          company,
          currency: dto.currency ?? 'USD',
          isDefault: dto.isDefault ?? false,
          active: dto.active ?? true,
          notes: dto.notes ?? null,
        },
      });
    });
  }

  async updatePriceList(id: number, dto: Partial<CreatePriceListDto>) {
    return this.prisma.$transaction(async (tx) => {
      const exists = await tx.priceList.findUnique({ where: { id } });
      if (!exists) throw new NotFoundException('PriceList no encontrada');

      if (dto.isDefault) {
        await tx.priceList.updateMany({
          where: { company: exists.company },
          data: { isDefault: false },
        });
      }

      return tx.priceList.update({
        where: { id },
        data: {
          code: dto.code ? slugCode(dto.code) : undefined,
          name: dto.name?.trim() ?? undefined,
          company: dto.company ?? undefined,
          currency: dto.currency ?? undefined,
          isDefault: dto.isDefault ?? undefined,
          active: dto.active ?? undefined,
          notes: dto.notes ?? undefined,
        },
      });
    });
  }

  async deletePriceList(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const exists = await tx.priceList.findUnique({ where: { id } });
      if (!exists) throw new NotFoundException('PriceList no encontrada');

      // borrar items primero (por si no hay cascade)
      await tx.priceListItem.deleteMany({
        where: { priceListId: id },
      });

      await tx.priceList.delete({
        where: { id },
      });

      return { ok: true };
    });
  }

  // =========================
  // ==== PRICE LIST ITEMS ===
  // =========================

  async upsertPriceListItem(priceListId: number, dto: UpsertPriceListItemDto) {
    if (!dto.inventoryItemId) {
      throw new BadRequestException('inventoryItemId requerido');
    }

    // valida inv exists
    const inv = await this.prisma.inventoryItem.findUnique({
      where: { id: dto.inventoryItemId },
    });
    if (!inv) throw new NotFoundException('InventoryItem no existe');

    const mode = dto.mode ?? PriceItemMode.MARGIN_OVER_COST;

    // ✅ enum correcto: FIXED
    if (mode === PriceItemMode.FIXED) {
      if (dto.fixedPriceUsd == null || Number(dto.fixedPriceUsd) <= 0) {
        throw new BadRequestException(
          'fixedPriceUsd requerido y > 0 cuando mode=FIXED',
        );
      }
    } else {
      if (dto.marginPct == null || Number(dto.marginPct) < 0) {
        throw new BadRequestException(
          'marginPct requerido y >= 0 cuando mode=MARGIN_OVER_COST',
        );
      }
    }

    return this.prisma.priceListItem.upsert({
      where: {
        priceListId_inventoryItemId: {
          priceListId,
          inventoryItemId: dto.inventoryItemId,
        },
      },
      create: {
        priceListId,
        inventoryItemId: dto.inventoryItemId,
        mode,
        fixedPriceUsd:
          dto.fixedPriceUsd != null
            ? new Prisma.Decimal(dto.fixedPriceUsd)
            : null,
        marginPct:
          dto.marginPct != null ? new Prisma.Decimal(dto.marginPct) : null,
        active: dto.active ?? true,
      },
      update: {
        mode,
        fixedPriceUsd:
          dto.fixedPriceUsd != null
            ? new Prisma.Decimal(dto.fixedPriceUsd)
            : null,
        marginPct:
          dto.marginPct != null ? new Prisma.Decimal(dto.marginPct) : null,
        active: dto.active ?? undefined,
      },
    });
  }

  async removePriceListItem(priceListId: number, inventoryItemId: number) {
    await this.prisma.priceListItem.delete({
      where: {
        priceListId_inventoryItemId: { priceListId, inventoryItemId },
      },
    });
    return { ok: true };
  }

  // =========================
  // == QUOTE / RESOLVE PRICE =
  // =========================

  async resolveUnitPriceUsd(priceListId: number, inventoryItemId: number) {
    const item = await this.prisma.priceListItem.findUnique({
      where: {
        priceListId_inventoryItemId: { priceListId, inventoryItemId },
      },
    });

    const inv = await this.prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    });
    if (!inv) throw new NotFoundException('InventoryItem no existe');

    const avgCost = Number(inv.avgCostUsd ?? 0);

    // fallback: si no hay item activo, usar costo
    if (!item || !item.active) {
      return {
        unitPriceUsd: round4(avgCost),
        priceListItemId: null,
        priceSource: 'FALLBACK_COST',
      };
    }

    if (item.mode === PriceItemMode.FIXED) {
      return {
        unitPriceUsd: round4(Number(item.fixedPriceUsd || 0)),
        priceListItemId: item.id,
        priceSource: 'PRICE_LIST_FIXED',
      };
    }

    const marginPct = Number(item.marginPct || 0);
    const unitPrice = avgCost * (1 + marginPct / 100);

    return {
      unitPriceUsd: round4(unitPrice),
      priceListItemId: item.id,
      priceSource: 'PRICE_LIST_MARGIN',
    };
  }
}
