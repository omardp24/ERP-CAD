import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFinancingPlanDto } from './dto/create-financing-plan.dto';
import { CreateFinancedItemDto } from './dto/create-financed-item.dto';

@Injectable()
export class FinancingPlansService {
  constructor(private readonly prisma: PrismaService) {}

  // ✅ Todos los planes de un productor
  async getFinancingPlansByProducer(producerId: number) {
    return this.prisma.financingPlan.findMany({
      where: { producerId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
      },
    });
  }

  // ✅ Un plan por id
  async getFinancingPlanById(id: number) {
    const plan = await this.prisma.financingPlan.findUnique({
      where: { id },
      include: {
        items: true,
        producer: true,
        cropPlan: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan de financiamiento no encontrado');
    }

    return plan;
  }

  // ✅ Crear plan (sin items todavía)
  async createFinancingPlan(dto: CreateFinancingPlanDto) {
    return this.prisma.financingPlan.create({
      data: {
        producerId: dto.producerId,
        cropPlanId: dto.cropPlanId ?? null,
        company: dto.company ?? 'CAD',
        season: dto.season,
        description: dto.description,
      },
      include: {
        items: true,
      },
    });
  }

    // ✅ Agregar item financiado y recalcular totales
  // OJO: aquí el parámetro se llama financingPlanId,
  // pero en el controller puedes seguir usando :planId sin problema.
  async addFinancedItem(
    financingPlanId: number,
    dto: CreateFinancedItemDto,
  ) {
    const plan = await this.prisma.financingPlan.findUnique({
      where: { id: financingPlanId },
    });

    if (!plan) {
      throw new NotFoundException('Plan de financiamiento no encontrado');
    }

    const financedPercent = dto.financingPercent ?? 100;

    const item = await this.prisma.financedItem.create({
      data: {
        financingPlanId,      // relación con el plan
        cycleId: dto.cycleId, // 👈 NUEVO: ciclo al que pertenece
        category: dto.category, // 👈 NUEVO: tipo de item (INPUT, FUEL, etc.)
        rateBcv: dto.rateBcv,   // 👈 NUEVO: BCV usado

        name: dto.name,
        unit: dto.unit,
        quantity: dto.quantity,
        unitCost: dto.unitCost,
        unitPrice: dto.unitPrice,
        financingPercent: financedPercent,
        notes: dto.notes ?? null,
      },
    });

    // Recalcular totales usando todos los items del plan
    const items = await this.prisma.financedItem.findMany({
      where: { financingPlanId }, // 👈 igual aquí
    });

    const totalCost = items.reduce((acc, it) => {
      const qty = Number(it.quantity ?? 0);
      const unitCost = Number(it.unitCost ?? 0);
      return acc + qty * unitCost;
    }, 0);

    const totalPrice = items.reduce((acc, it) => {
      const qty = Number(it.quantity ?? 0);
      const unitPrice = Number(it.unitPrice ?? 0);
      return acc + qty * unitPrice;
    }, 0);

    const totalFinanced = items.reduce((acc, it) => {
      const qty = Number(it.quantity ?? 0);
      const unitCost = Number(it.unitCost ?? 0);
      // 👇 AQUÍ ESTABA EL OTRO ERROR: usar financingPercent
      const percent = Number(it.financingPercent ?? 100) / 100;
      return acc + qty * unitCost * percent;
    }, 0);

    await this.prisma.financingPlan.update({
      where: { id: financingPlanId },
      data: {
        totalCost,
        totalPrice,
        totalFinanced,
      },
    });

    return item;
  }
}