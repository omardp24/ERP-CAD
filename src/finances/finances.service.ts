import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { LiquidateDto } from './dto/liquidate.dto';
import { AdministrativeMovementType } from '@prisma/client';
import { CreateProducerPaymentScheduleDto } from './dto/create-producer-payment-schedule.dto';
import { ExecuteProducerPaymentScheduleDto } from './dto/execute-producer-payment-schedule.dto';
import { CreateFinancedItemDto } from './dto/create-financed-item.dto';
import { CreateCycleExtraCostDto } from './dto/create-cycle-extra-cost.dto';
import { CreateFinancingCycleDto } from './dto/create-financing-cycle.dto';

type RequestScopes = {
  warehouseIds: number[] | null;
  producerIds: number[] | null;
  companies: string[] | null; // ['CAD','SILO_AMAZO'] o null
};

@Injectable()
export class FinancesService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // ✅ Helpers de scopes
  // =========================================================

  private applyProducerCompanyScopesToWhere(
    where: any,
    scopes?: RequestScopes,
    role?: string,
  ) {
    if (role === 'ADMIN') return where;

    // producerIds null => acceso total
    if (scopes?.producerIds && Array.isArray(scopes.producerIds)) {
      // Si where ya trae producerId fijo, validar permiso
      if (typeof where.producerId === 'number') {
        if (!scopes.producerIds.includes(where.producerId)) {
          where.producerId = { in: [] as number[] }; // fuerza vacío
        }
      } else if (where.producerId?.in && Array.isArray(where.producerId.in)) {
        where.producerId = {
          in: where.producerId.in.filter((x: number) =>
            scopes.producerIds!.includes(x),
          ),
        };
      } else {
        where.producerId = { in: scopes.producerIds };
      }
    }

    // companies null => acceso total
    if (scopes?.companies && Array.isArray(scopes.companies)) {
      // Si where ya trae company fija, validar permiso
      if (typeof where.company === 'string') {
        if (!scopes.companies.includes(where.company)) {
          where.company = { in: [] as string[] }; // fuerza vacío
        }
      } else if (where.company?.in && Array.isArray(where.company.in)) {
        where.company = {
          in: where.company.in.filter((x: string) =>
            scopes.companies!.includes(x),
          ),
        };
      } else {
        where.company = { in: scopes.companies };
      }
    }

    return where;
  }

  private assertCanAccessProducer(
    producerId: number,
    scopes?: RequestScopes,
    role?: string,
  ) {
    if (role === 'ADMIN') return;
    if (!scopes?.producerIds) return; // null => acceso total
    if (!scopes.producerIds.includes(producerId)) {
      throw new BadRequestException('No tienes permisos para este productor.');
    }
  }

  private assertCanAccessCompany(
    company: string,
    scopes?: RequestScopes,
    role?: string,
  ) {
    if (role === 'ADMIN') return;
    if (!scopes?.companies) return; // null => acceso total
    if (!scopes.companies.includes(company)) {
      throw new BadRequestException('No tienes permisos para esta empresa.');
    }
  }

  // Helper: obtener datos de crop_plans (plan de siembra)
  private async resolveCropPlanData(cropPlanId?: number) {
    if (!cropPlanId) {
      return {
        cropPlan: null,
        cycle: null,
        producerIdFromPlan: null,
      };
    }

    const cropPlan = await this.prisma.crop_plans.findUnique({
      where: { id: cropPlanId },
    });

    if (!cropPlan) {
      throw new BadRequestException('Plan de siembra no encontrado.');
    }

    return {
      cropPlan,
      cycle: cropPlan.cycle ?? null,
      producerIdFromPlan: cropPlan.producer_id ?? null,
    };
  }

  // 1. Crear movimiento (anticipo, pago directo, ajuste)
  async createMovement(dto: CreateMovementDto, scopes?: RequestScopes, role?: string) {
    if (!dto) {
      throw new BadRequestException(
        'El cuerpo (body) de la petición está vacío o es inválido.',
      );
    }

    const { cycle, producerIdFromPlan } = await this.resolveCropPlanData(
      dto.cropPlanId,
    );

    const finalProducerId = dto.producerId ?? producerIdFromPlan;

    if (!finalProducerId) {
      throw new BadRequestException(
        'Debes enviar producerId o un cropPlanId asociado a un productor.',
      );
    }

    if (!dto.type) {
      throw new BadRequestException('Debes enviar type.');
    }

    if (!dto.amountUsd && !dto.amountBs) {
      throw new BadRequestException('Debes enviar amountUsd o amountBs.');
    }

    if (!dto.rateBcv || dto.rateBcv <= 0) {
      throw new BadRequestException(
        'Debes enviar una tasa BCV válida (rateBcv > 0).',
      );
    }

    // Reglas de documentos
    if (dto.type === 'PAYMENT') {
      if (!dto.documentType) {
        throw new BadRequestException(
          'Debes enviar documentType para un movimiento de tipo PAYMENT.',
        );
      }
      if (!dto.documentNumber) {
        throw new BadRequestException(
          'Debes enviar documentNumber para un movimiento de tipo PAYMENT.',
        );
      }
    }

    // Validar company (opcional)
    if (dto.company && !['CAD', 'SILO_AMAZO'].includes(dto.company)) {
      throw new BadRequestException('company debe ser CAD o SILO_AMAZO');
    }

    const company = dto.company ?? 'CAD';

    // ✅ permisos (antes de crear)
    this.assertCanAccessProducer(finalProducerId, scopes, role);
    this.assertCanAccessCompany(company, scopes, role);

    // 1) Normalizar montos (USD es la moneda "real" para caja)
    let amountUsd = dto.amountUsd ?? 0;
    let amountBs = dto.amountBs ?? 0;

    if (amountUsd && !amountBs) {
      amountBs = Number((amountUsd * dto.rateBcv).toFixed(2));
    } else if (!amountUsd && amountBs) {
      amountUsd = Number((amountBs / dto.rateBcv).toFixed(2));
    }

    if (!amountUsd || amountUsd <= 0) {
      throw new BadRequestException(
        'No se pudo determinar un monto válido en USD.',
      );
    }

    // 2) Fecha de movimiento
    const movementDate = dto.movementDate
      ? new Date(dto.movementDate)
      : new Date();

    // 3) Transacción: movimiento financiero + movimiento administrativo (opcional)
    return this.prisma.$transaction(async (tx) => {
      // 3.1 Crear movimiento financiero (productor)
      const movement = await tx.financeMovement.create({
        data: {
          type: dto.type,
          producerId: finalProducerId,
          cropPlanId: dto.cropPlanId ?? null,

          amountUsd,
          amountBs,
          rateBcv: dto.rateBcv,

          description: dto.description ?? null,
          documentType: dto.documentType ?? null,
          documentNumber: dto.documentNumber ?? null,

          cycle: cycle ?? null,
          status: 'ACTIVE',
          movementDate,

          commissionType: dto.commissionType ?? null,
          commissionRate: dto.commissionRate ?? null,
          commissionCurrency: dto.commissionCurrency ?? 'USD',

          company,
        },
      });

      // 3.2 Si NO viene adminAccountId, no tocamos cuentas administrativas
      if (!dto.adminAccountId) {
        return movement;
      }

      // Solo tiene sentido afectar caja para ADVANCE y PAYMENT
      if (!['ADVANCE', 'PAYMENT'].includes(dto.type)) {
        return movement;
      }

      // 3.3 Buscar cuenta administrativa
      const adminAccount = await tx.administrativeAccount.findUnique({
        where: { id: dto.adminAccountId },
      });

      if (!adminAccount) {
        throw new BadRequestException(
          `Cuenta administrativa ${dto.adminAccountId} no encontrada.`,
        );
      }

      if (!adminAccount.active) {
        throw new BadRequestException(
          'La cuenta administrativa está inactiva.',
        );
      }

      // 3.4 Determinar tipo de movimiento admin y efecto en saldo
      const adminMovementType =
        dto.type === 'ADVANCE'
          ? AdministrativeMovementType.WITHDRAW
          : AdministrativeMovementType.DEPOSIT;

      const balanceDelta = dto.type === 'ADVANCE' ? -amountUsd : amountUsd;

      // Si es anticipo (ADVANCE), validamos saldo suficiente en la cuenta
      if (dto.type === 'ADVANCE') {
        const newBalance = Number(adminAccount.balance) + balanceDelta;
        if (newBalance < 0) {
          throw new BadRequestException(
            'La cuenta administrativa no tiene saldo suficiente para este anticipo.',
          );
        }
      }

      // 3.5 Crear movimiento administrativo
      await tx.administrativeMovement.create({
        data: {
          accountId: adminAccount.id,
          type: adminMovementType,
          amount: amountUsd,
          description:
            dto.description ??
            `Movimiento financiero para productor ${finalProducerId} (ID movimiento: ${movement.id})`,
        },
      });

      // 3.6 Actualizar saldo de la cuenta admin
      await tx.administrativeAccount.update({
        where: { id: adminAccount.id },
        data: {
          balance: adminAccount.balance + balanceDelta,
        },
      });

      return movement;
    });
  }

  // 2. Liquidación (kg entregados x precio/kg) -> genera PAYMENT
  async liquidate(dto: LiquidateDto, scopes?: RequestScopes, role?: string) {
    const { cycle, producerIdFromPlan } = await this.resolveCropPlanData(
      dto.cropPlanId,
    );

    const finalProducerId = dto.producerId ?? producerIdFromPlan;

    if (!finalProducerId) {
      throw new BadRequestException(
        'Debes enviar producerId o un cropPlanId asociado a un productor.',
      );
    }

    // company si no viene en dto, se deja null (como tú lo hacías)
    // pero para permisos, si tu sistema usa company en financeMovement, mejor definirla
    const company = (dto as any).company ?? null;
    if (company && !['CAD', 'SILO_AMAZO'].includes(company)) {
      throw new BadRequestException('company debe ser CAD o SILO_AMAZO');
    }

    this.assertCanAccessProducer(finalProducerId, scopes, role);
    if (company) this.assertCanAccessCompany(company, scopes, role);

    if (!dto.kgEntregados || dto.kgEntregados <= 0) {
      throw new BadRequestException('kgEntregados debe ser mayor a 0.');
    }

    if (!dto.precioKgUsd || dto.precioKgUsd <= 0) {
      throw new BadRequestException('precioKgUsd debe ser mayor a 0.');
    }

    if (!dto.rateBcv || dto.rateBcv <= 0) {
      throw new BadRequestException(
        'Debes enviar una tasa BCV válida (rateBcv > 0).',
      );
    }

    const totalUsd = dto.kgEntregados * dto.precioKgUsd;
    const totalBs = totalUsd * dto.rateBcv;

    return this.prisma.financeMovement.create({
      data: {
        producerId: finalProducerId,
        cropPlanId: dto.cropPlanId ?? null,
        type: 'PAYMENT',
        amountUsd: totalUsd,
        amountBs: totalBs,
        rateBcv: dto.rateBcv,
        description: dto.description ?? 'Liquidación',
        cycle: cycle ?? null,
        documentType: null,
        documentNumber: null,
        company: company ?? undefined,
      },
    });
  }

  // 3. Listar todos los movimientos
  async findAllMovements(scopes?: RequestScopes, role?: string) {
    const where: any = {};
    this.applyProducerCompanyScopesToWhere(where, scopes, role);

    return this.prisma.financeMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { producer: true },
    });
  }

  // 4. Buscar un movimiento por id
  async findOneMovement(id: number, scopes?: RequestScopes, role?: string) {
    const movement = await this.prisma.financeMovement.findUnique({
      where: { id },
    });

    if (!movement) {
      throw new NotFoundException('Movimiento financiero no encontrado');
    }

    // ✅ permisos por productor/company
    this.assertCanAccessProducer(movement.producerId, scopes, role);
    if (movement.company) this.assertCanAccessCompany(movement.company, scopes, role);

    return movement;
  }

  // 5. Actualizar movimiento
  async updateMovement(id: number, dto: UpdateMovementDto, scopes?: RequestScopes, role?: string) {
    const current = await this.findOneMovement(id, scopes, role); // asegura que exista + permisos

    // si cambian producerId o company, validar permisos
    const nextProducerId = (dto as any).producerId ?? current.producerId;
    const nextCompany = (dto as any).company ?? current.company ?? 'CAD';

    this.assertCanAccessProducer(nextProducerId, scopes, role);
    if (nextCompany) this.assertCanAccessCompany(nextCompany, scopes, role);

    return this.prisma.financeMovement.update({
      where: { id },
      data: dto,
    });
  }

  // 6. Eliminar movimiento
  async removeMovement(id: number, scopes?: RequestScopes, role?: string) {
    await this.findOneMovement(id, scopes, role);
    return this.prisma.financeMovement.delete({
      where: { id },
    });
  }

  // 7. Movimientos por productor (opcionalmente por ciclo y company)
  async findMovementsByProducer(
    producerId: number,
    cycle?: string,
    company?: string,
    scopes?: RequestScopes,
    role?: string,
  ) {
    // ✅ permisos
    this.assertCanAccessProducer(producerId, scopes, role);
    if (company) this.assertCanAccessCompany(company, scopes, role);

    const where: any = { producerId };

    if (cycle) where.cycle = cycle;
    if (company) where.company = company;

    // ✅ también aplicar scopes por si company viene null
    this.applyProducerCompanyScopesToWhere(where, scopes, role);

    return this.prisma.financeMovement.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  // 8. Resumen general (todos los productores, opcionalmente por ciclo y company)
  async getSummary(cycle?: string, company?: string, scopes?: RequestScopes, role?: string) {
    if (company) this.assertCanAccessCompany(company, scopes, role);

    const where: any = {};
    if (cycle) where.cycle = cycle;
    if (company) where.company = company;

    this.applyProducerCompanyScopesToWhere(where, scopes, role);

    const movements = await this.prisma.financeMovement.findMany({ where });

    const totals = movements.reduce(
      (acc, mov) => {
        if (mov.type === 'ADVANCE') {
          acc.advanceUsd += mov.amountUsd;
          acc.advanceBs += mov.amountBs;
        } else if (mov.type === 'PAYMENT') {
          acc.paymentUsd += mov.amountUsd;
          acc.paymentBs += mov.amountBs;
        } else if (mov.type === 'ADJUSTMENT') {
          acc.adjustUsd += mov.amountUsd;
          acc.adjustBs += mov.amountBs;
        }
        return acc;
      },
      {
        advanceUsd: 0,
        advanceBs: 0,
        paymentUsd: 0,
        paymentBs: 0,
        adjustUsd: 0,
        adjustBs: 0,
      },
    );

    const netUsd = totals.advanceUsd - totals.paymentUsd + totals.adjustUsd;
    const netBs = totals.advanceBs - totals.paymentBs + totals.adjustBs;

    const producersOweUsd = netUsd > 0 ? netUsd : 0;
    const cadOwesUsd = netUsd < 0 ? -netUsd : 0;

    const producersOweBs = netBs > 0 ? netBs : 0;
    const cadOwesBs = netBs < 0 ? -netBs : 0;

    let direction: 'PRODUCER_OWES' | 'CAD_OWES' | 'SETTLED' = 'SETTLED';
    if (netUsd > 0) direction = 'PRODUCER_OWES';
    else if (netUsd < 0) direction = 'CAD_OWES';

    return {
      cycle: cycle ?? null,
      company: company ?? null,
      totals,
      netUsd,
      netBs,
      producersOweUsd,
      producersOweBs,
      cadOwesUsd,
      cadOwesBs,
      direction,
      movements,
    };
  }

  // 9. Estado de cuenta por productor
  async getProducerStatement(
    producerId: number,
    cycle?: string,
    company?: string,
    scopes?: RequestScopes,
    role?: string,
  ) {
    const movements = await this.findMovementsByProducer(
      producerId,
      cycle,
      company,
      scopes,
      role,
    );

    const totals = movements.reduce(
      (acc, mov) => {
        if (mov.type === 'ADVANCE') {
          acc.advanceUsd += mov.amountUsd;
          acc.advanceBs += mov.amountBs;
        } else if (mov.type === 'PAYMENT') {
          acc.paymentUsd += mov.amountUsd;
          acc.paymentBs += mov.amountBs;
        } else if (mov.type === 'ADJUSTMENT') {
          acc.adjustUsd += mov.amountUsd;
          acc.adjustBs += mov.amountBs;
        }
        return acc;
      },
      {
        advanceUsd: 0,
        advanceBs: 0,
        paymentUsd: 0,
        paymentBs: 0,
        adjustUsd: 0,
        adjustBs: 0,
      },
    );

    const rawNetUsd =
      totals.advanceUsd - totals.paymentUsd + totals.adjustUsd;
    const rawNetBs =
      totals.advanceBs - totals.paymentBs + totals.adjustBs;

    const netUsd = Number(rawNetUsd.toFixed(2));
    const netBs = Number(rawNetBs.toFixed(2));

    const producerOwesUsd = netUsd > 0 ? netUsd : 0;
    const cadOwesUsd = netUsd < 0 ? -netUsd : 0;

    const producerOwesBs = netBs > 0 ? netBs : 0;
    const cadOwesBs = netBs < 0 ? -netBs : 0;

    let direction: 'PRODUCER_OWES' | 'CAD_OWES' | 'SETTLED' = 'SETTLED';
    if (netUsd > 0) direction = 'PRODUCER_OWES';
    else if (netUsd < 0) direction = 'CAD_OWES';

    const commissionsData = await this.getProducerAdvanceCommissions(
      producerId,
      undefined,
      cycle,
      company,
      scopes,
      role,
    );

    const commissionsUsd = commissionsData.totalCommissionUsd;
    const commissionsBs = 0;

    const totalUsdWithCommissions = Number(
      (netUsd + commissionsUsd).toFixed(2),
    );

    let totalDirection: 'PRODUCER_OWES' | 'CAD_OWES' | 'SETTLED' = 'SETTLED';
    if (totalUsdWithCommissions > 0) totalDirection = 'PRODUCER_OWES';
    else if (totalUsdWithCommissions < 0) totalDirection = 'CAD_OWES';

    return {
      producerId,
      cycle: cycle ?? null,
      company: company ?? null,
      totals,
      netUsd,
      netBs,
      saldoUsd: netUsd,
      saldoBs: netBs,
      producerOwesUsd,
      producerOwesBs,
      cadOwesUsd,
      cadOwesBs,
      direction,
      commissionsUsd,
      commissionsBs,
      totalUsdWithCommissions,
      totalDirection,
      movements,
    };
  }

  // 10. Overview global (con filtro opcional por cycle y company)
  async getOverview(cycle?: string, company?: string, scopes?: RequestScopes, role?: string) {
    if (company) this.assertCanAccessCompany(company, scopes, role);

    const where: any = {};
    if (cycle) where.cycle = cycle;
    if (company) where.company = company;

    this.applyProducerCompanyScopesToWhere(where, scopes, role);

    const movements = await this.prisma.financeMovement.findMany({
      where,
      orderBy: {
        movementDate: 'asc',
      },
    });

    const totals = movements.reduce(
      (acc, mov) => {
        if (mov.type === 'ADVANCE') {
          acc.advanceUsd += mov.amountUsd;
          acc.advanceBs += mov.amountBs;
        } else if (mov.type === 'PAYMENT') {
          acc.paymentUsd += mov.amountUsd;
          acc.paymentBs += mov.amountBs;
        } else if (mov.type === 'ADJUSTMENT') {
          acc.adjustUsd += mov.amountUsd;
          acc.adjustBs += mov.amountBs;
        }
        return acc;
      },
      {
        advanceUsd: 0,
        advanceBs: 0,
        paymentUsd: 0,
        paymentBs: 0,
        adjustUsd: 0,
        adjustBs: 0,
      },
    );

    const netUsd =
      totals.advanceUsd - totals.paymentUsd + totals.adjustUsd;
    const netBs =
      totals.advanceBs - totals.paymentBs + totals.adjustBs;

    const producerMap = new Map<
      number,
      {
        producerId: number;
        netUsd: number;
        netBs: number;
        producerOwesUsd: number;
        producerOwesBs: number;
        cadOwesUsd: number;
        cadOwesBs: number;
        direction: 'PRODUCER_OWES' | 'CAD_OWES' | 'SETTLED';
      }
    >();

    for (const mov of movements) {
      const pid = mov.producerId!;
      if (!producerMap.has(pid)) {
        producerMap.set(pid, {
          producerId: pid,
          netUsd: 0,
          netBs: 0,
          producerOwesUsd: 0,
          producerOwesBs: 0,
          cadOwesUsd: 0,
          cadOwesBs: 0,
          direction: 'SETTLED',
        });
      }

      const p = producerMap.get(pid)!;

      let factor = 1;
      if (mov.type === 'PAYMENT') factor = -1;

      p.netUsd += factor * mov.amountUsd;
      p.netBs += factor * mov.amountBs;
    }

    let totalProducerOwesUsd = 0;
    let totalProducerOwesBs = 0;
    let totalCadOwesUsd = 0;
    let totalCadOwesBs = 0;

    for (const p of producerMap.values()) {
      if (p.netUsd > 0) {
        p.producerOwesUsd = Number(p.netUsd.toFixed(2));
        totalProducerOwesUsd += p.producerOwesUsd;
        p.direction = 'PRODUCER_OWES';
      } else if (p.netUsd < 0) {
        p.cadOwesUsd = Number((-p.netUsd).toFixed(2));
        totalCadOwesUsd += p.cadOwesUsd;
        p.direction = 'CAD_OWES';
      } else {
        p.direction = 'SETTLED';
      }

      if (p.netBs > 0) {
        p.producerOwesBs = Number(p.netBs.toFixed(2));
        totalProducerOwesBs += p.producerOwesBs;
      } else if (p.netBs < 0) {
        p.cadOwesBs = Number((-p.netBs).toFixed(2));
        totalCadOwesBs += p.cadOwesBs;
      }
    }

    const producers = Array.from(producerMap.values());
    producers.sort((a, b) => b.producerOwesUsd - a.producerOwesUsd);

    return {
      cycle: cycle ?? null,
      company: company ?? null,
      totals,
      netUsd,
      netBs,
      totalProducerOwesUsd: Number(totalProducerOwesUsd.toFixed(2)),
      totalProducerOwesBs: Number(totalProducerOwesBs.toFixed(2)),
      totalCadOwesUsd: Number(totalCadOwesUsd.toFixed(2)),
      totalCadOwesBs: Number(totalCadOwesBs.toFixed(2)),
      producers,
    };
  }
  // 11. Interés simple sobre saldo del productor
async getProducerInterest(
  producerId: number,
  annualRate: number,
  cycle?: string,
  untilDateStr?: string,
  company?: string,
) {
  if (!annualRate || annualRate <= 0) {
    throw new BadRequestException('Debes enviar una tasa anual válida (> 0).');
  }

  const movements = await this.findMovementsByProducer(producerId, cycle, company);

  if (!movements.length) {
    return {
      producerId,
      annualRate,
      cycle: cycle ?? null,
      company: company ?? null,
      untilDate: untilDateStr ?? null,
      interestUsd: 0,
      baseNetUsd: 0,
      totalUsdWithInterest: 0,
      movements: [],
    };
  }

  movements.sort((a, b) => {
    const da = a.movementDate ?? a.createdAt;
    const db = b.movementDate ?? b.createdAt;
    return da.getTime() - db.getTime();
  });

  const ratePerUnit = annualRate / 100;

  let runningBalanceUsd = 0;
  let interestUsd = 0;

  let previousDate = movements[0].movementDate ?? movements[0].createdAt ?? new Date();
  const untilDate = untilDateStr ? new Date(untilDateStr) : new Date();

  for (const mov of movements) {
    const currentDate = mov.movementDate ?? mov.createdAt ?? previousDate;

    const diffMs = currentDate.getTime() - previousDate.getTime();
    const days = diffMs / (1000 * 60 * 60 * 24);

    if (days > 0 && runningBalanceUsd > 0) {
      interestUsd += runningBalanceUsd * ratePerUnit * (days / 365);
    }

    let factor = 1;
    if (mov.type === 'PAYMENT') factor = -1;

    runningBalanceUsd += factor * mov.amountUsd;

    previousDate = currentDate;
  }

  const diffMsFinal = untilDate.getTime() - previousDate.getTime();
  const daysFinal = diffMsFinal / (1000 * 60 * 60 * 24);

  if (daysFinal > 0 && runningBalanceUsd > 0) {
    interestUsd += runningBalanceUsd * ratePerUnit * (daysFinal / 365);
  }

  interestUsd = Number(interestUsd.toFixed(2));

  const baseStatement = await this.getProducerStatement(producerId, cycle, company);
  const baseNetUsd = Number(baseStatement.netUsd.toFixed(2));

  if (baseNetUsd <= 0) {
    return {
      producerId,
      annualRate,
      cycle: cycle ?? null,
      company: company ?? null,
      untilDate: untilDate.toISOString(),
      interestUsd: 0,
      baseNetUsd,
      totalUsdWithInterest: baseNetUsd,
      direction: baseStatement.direction,
      baseStatement,
    };
  }

  const totalUsdWithInterest = Number((baseNetUsd + interestUsd).toFixed(2));

  return {
    producerId,
    annualRate,
    cycle: cycle ?? null,
    company: company ?? null,
    untilDate: untilDate.toISOString(),
    interestUsd,
    baseNetUsd,
    totalUsdWithInterest,
    direction: baseStatement.direction,
    baseStatement,
  };
}

// 12. Estado de cuenta por plan de siembra
async getCropPlanStatement(cropPlanId: number) {
  const movements = await this.prisma.financeMovement.findMany({
    where: { cropPlanId },
    orderBy: { createdAt: 'asc' },
  });

  const totals = movements.reduce(
    (acc, mov) => {
      if (mov.type === 'ADVANCE') {
        acc.advanceUsd += mov.amountUsd;
        acc.advanceBs += mov.amountBs;
      } else if (mov.type === 'PAYMENT') {
        acc.paymentUsd += mov.amountUsd;
        acc.paymentBs += mov.amountBs;
      } else if (mov.type === 'ADJUSTMENT') {
        acc.adjustUsd += mov.amountUsd;
        acc.adjustBs += mov.amountBs;
      }
      return acc;
    },
    {
      advanceUsd: 0,
      advanceBs: 0,
      paymentUsd: 0,
      paymentBs: 0,
      adjustUsd: 0,
      adjustBs: 0,
    },
  );

  const netUsd = totals.advanceUsd - totals.paymentUsd + totals.adjustUsd;
  const netBs = totals.advanceBs - totals.paymentBs + totals.adjustBs;

  return {
    cropPlanId,
    totals,
    netUsd,
    netBs,
    movements,
  };
}

  // 13. Comisiones sobre anticipos
  async getProducerAdvanceCommissions(
    producerId: number,
    untilDateStr?: string,
    cycle?: string,
    company?: string,
    scopes?: RequestScopes,
    role?: string,
  ) {
    this.assertCanAccessProducer(producerId, scopes, role);
    if (company) this.assertCanAccessCompany(company, scopes, role);

    const untilDate = untilDateStr ? new Date(untilDateStr) : new Date();

    const where: any = {
      producerId,
      type: 'ADVANCE',
    };

    if (cycle) where.cycle = cycle;
    if (company) where.company = company;

    this.applyProducerCompanyScopesToWhere(where, scopes, role);

    const advances = await this.prisma.financeMovement.findMany({
      where,
      orderBy: {
        movementDate: 'asc',
      },
    });

    let totalCommissionUsd = 0;

    const details = advances.map((adv) => {
      if (!adv.commissionType || !adv.commissionRate) {
        return {
          movementId: adv.id,
          type: adv.type,
          amountUsd: adv.amountUsd,
          commissionUsd: 0,
          commissionType: adv.commissionType,
          commissionRate: adv.commissionRate,
          commissionCurrency: adv.commissionCurrency,
        };
      }

      const baseDate = adv.movementDate ?? adv.createdAt ?? untilDate;
      const amount = adv.amountUsd;
      const rate = adv.commissionRate / 100;

      let commissionUsd = 0;

      if (adv.commissionType === 'FLAT') {
        commissionUsd = amount * rate;
      } else {
        const diffMs = untilDate.getTime() - baseDate.getTime();
        const days = diffMs / (1000 * 60 * 60 * 24);

        let factor = 0;
        switch (adv.commissionType) {
          case 'WEEKLY':
            factor = 7;
            break;
          case 'MONTHLY':
            factor = 30;
            break;
          case 'QUARTERLY':
            factor = 90;
            break;
          case 'ANNUAL':
            factor = 365;
            break;
        }

        const periods = factor > 0 ? days / factor : 0;
        commissionUsd = amount * rate * periods;
      }

      commissionUsd = Number(commissionUsd.toFixed(2));
      totalCommissionUsd += commissionUsd;

      return {
        movementId: adv.id,
        type: adv.type,
        amountUsd: adv.amountUsd,
        commissionUsd,
        commissionType: adv.commissionType,
        commissionRate: adv.commissionRate,
        commissionCurrency: adv.commissionCurrency,
      };
    });

    totalCommissionUsd = Number(totalCommissionUsd.toFixed(2));

    return {
      producerId,
      cycle: cycle ?? null,
      company: company ?? null,
      untilDate: untilDate.toISOString(),
      totalCommissionUsd,
      advances: details,
    };
  }

  // =========================================================
  // ✅ LO DEMÁS LO DEJO IGUAL (no es listado sensible)
  // pero donde toques producer/company, ideal pasar scopes/role también
  // =========================================================

  // 14. Overview global de finanzas (caja + cartera productores)
  async getGlobalOverview() {
    const [adminAccounts, financeMovements] = await this.prisma.$transaction([
      this.prisma.administrativeAccount.findMany(),
      this.prisma.financeMovement.findMany(),
    ]);

    const balancesByCurrency: Record<string, number> = {};

    for (const acc of adminAccounts) {
      const currency = (acc as any).currency || 'UNKNOWN';
      if (!balancesByCurrency[currency]) {
        balancesByCurrency[currency] = 0;
      }
      balancesByCurrency[currency] += Number(acc.balance ?? 0);
    }

    let totalAdvancedUsd = 0;
    let totalLiquidatedUsd = 0;
    let totalCommissionUsd = 0;

    for (const m of financeMovements) {
      const amountUsd = Number((m as any).amountUsd ?? 0);
      const commissionUsd = Number((m as any).commissionUsd ?? 0);

      if (m.type === 'ADVANCE') {
        totalAdvancedUsd += amountUsd;
      } else if (m.type === 'LIQUIDATION') {
        totalLiquidatedUsd += amountUsd;
      }

      totalCommissionUsd += commissionUsd;
    }

    const portfolioUsd = totalAdvancedUsd - totalLiquidatedUsd;

    return {
      adminAccounts: {
        totalAccounts: adminAccounts.length,
        balancesByCurrency,
      },
      financing: {
        totalMovements: financeMovements.length,
        totalAdvancedUsd,
        totalLiquidatedUsd,
        totalCommissionUsd,
        portfolioUsd,
      },
    };
  }

  // 15. Calendario / proyección de pagos y anticipos por día
  async getPaymentSchedule(from?: string, to?: string, company?: string, scopes?: RequestScopes, role?: string) {
    if (company) this.assertCanAccessCompany(company, scopes, role);

    const fromDate = from ? new Date(from) : new Date();
    const toDate = to
      ? new Date(to)
      : new Date(fromDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const where: any = {
      movementDate: {
        gte: fromDate,
        lte: toDate,
      },
      type: { in: ['ADVANCE', 'PAYMENT'] },
    };

    if (company) where.company = company;

    this.applyProducerCompanyScopesToWhere(where, scopes, role);

    const movements = await this.prisma.financeMovement.findMany({
      where,
      orderBy: { movementDate: 'asc' },
    });

    const daysMap = new Map<
      string,
      {
        date: string;
        totalAdvanceUsd: number;
        totalPaymentUsd: number;
        netUsd: number;
        movements: any[];
      }
    >();

    for (const mov of movements) {
      const dateObj = mov.movementDate ?? mov.createdAt ?? new Date();
      const dateKey = dateObj.toISOString().slice(0, 10);

      if (!daysMap.has(dateKey)) {
        daysMap.set(dateKey, {
          date: dateKey,
          totalAdvanceUsd: 0,
          totalPaymentUsd: 0,
          netUsd: 0,
          movements: [],
        });
      }

      const day = daysMap.get(dateKey)!;
      const amountUsd = Number(mov.amountUsd ?? 0);

      if (mov.type === 'ADVANCE') {
        day.totalAdvanceUsd += amountUsd;
        day.netUsd += amountUsd;
      } else if (mov.type === 'PAYMENT') {
        day.totalPaymentUsd += amountUsd;
        day.netUsd -= amountUsd;
      }

      day.movements.push({
        id: mov.id,
        type: mov.type,
        producerId: mov.producerId,
        amountUsd: mov.amountUsd,
        amountBs: mov.amountBs,
        movementDate: dateObj,
        company: mov.company,
        description: mov.description,
      });
    }

    const days = Array.from(daysMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      company: company ?? null,
      days,
    };
  }

  // 16. Resumen de riesgo (top deudores y saldo a favor)
  async getRiskSummary(
    cycle?: string,
    company?: string,
    topN: number = 10,
    scopes?: RequestScopes,
    role?: string,
  ) {
    const overview = await this.getOverview(cycle, company, scopes, role);

    const producers = overview.producers as Array<{
      producerId: number;
      netUsd: number;
      netBs: number;
      producerOwesUsd: number;
      producerOwesBs: number;
      cadOwesUsd: number;
      cadOwesBs: number;
      direction: 'PRODUCER_OWES' | 'CAD_OWES' | 'SETTLED';
    }>;

    const topDebtors = producers
      .filter((p) => p.direction === 'PRODUCER_OWES')
      .sort((a, b) => b.producerOwesUsd - a.producerOwesUsd)
      .slice(0, topN);

    const topCredits = producers
      .filter((p) => p.direction === 'CAD_OWES')
      .sort((a, b) => b.cadOwesUsd - a.cadOwesUsd)
      .slice(0, topN);

    return {
      cycle: overview.cycle,
      company: overview.company,
      totals: {
        netUsd: overview.netUsd,
        netBs: overview.netBs,
        totalProducerOwesUsd: overview.totalProducerOwesUsd,
        totalProducerOwesBs: overview.totalProducerOwesBs,
        totalCadOwesUsd: overview.totalCadOwesUsd,
        totalCadOwesBs: overview.totalCadOwesBs,
      },
      topDebtors,
      topCredits,
    };
  }

  // 17. Crear schedule de pago a productor
  async createProducerPaymentSchedule(dto: CreateProducerPaymentScheduleDto, scopes?: RequestScopes, role?: string) {
    this.assertCanAccessProducer(dto.producerId, scopes, role);
    if (dto.company) this.assertCanAccessCompany(dto.company, scopes, role);

    const producer = await this.prisma.producers.findUnique({
      where: { id: dto.producerId },
    });

    if (!producer) {
      throw new NotFoundException('Producer no encontrado');
    }

    return this.prisma.producerPaymentSchedule.create({
      data: {
        producerId: dto.producerId,
        cycle: dto.cycle,
        company: dto.company,
        amountUsd: dto.amountUsd,
        scheduledDate: new Date(dto.scheduledDate),
        adminAccountId: dto.adminAccountId ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  // 18. Listar schedules de pago
  async listProducerPaymentSchedules(status?: string, producerId?: number, scopes?: RequestScopes, role?: string) {
    if (producerId) this.assertCanAccessProducer(producerId, scopes, role);

    const where: any = {
      status: status ?? undefined,
      producerId: producerId ?? undefined,
    };

    // si no viene producerId pero hay scope, filtramos por productores permitidos
    this.applyProducerCompanyScopesToWhere(where, scopes, role);

    return this.prisma.producerPaymentSchedule.findMany({
      where,
      orderBy: { scheduledDate: 'asc' },
      include: { producer: true },
    });
  }

  // 19. Ejecutar schedule de pago
  async executeProducerPaymentSchedule(
    scheduleId: number,
    dto: ExecuteProducerPaymentScheduleDto,
    scopes?: RequestScopes,
    role?: string,
  ) {
    const schedule = await this.prisma.producerPaymentSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException('Producer payment schedule not found');
    }

    this.assertCanAccessProducer(schedule.producerId, scopes, role);
    if (schedule.company) this.assertCanAccessCompany(schedule.company, scopes, role);

    if (schedule.status === 'EXECUTED') {
      throw new BadRequestException('This schedule is already executed');
    }

    const adminAccountId = dto.adminAccountId ?? schedule.adminAccountId;
    if (!adminAccountId) {
      throw new BadRequestException(
        'adminAccountId is required to execute this schedule',
      );
    }

    const adminAccount = await this.prisma.administrativeAccount.findUnique({
      where: { id: adminAccountId },
    });

    if (!adminAccount || !adminAccount.active) {
      throw new BadRequestException(
        `Administrative account ${adminAccountId} not found or inactive`,
      );
    }

    if (!dto.rateBcv || dto.rateBcv <= 0) {
      throw new BadRequestException('rateBcv must be greater than 0');
    }

    const amountUsd = schedule.amountUsd;
    if (!amountUsd || amountUsd <= 0) {
      throw new BadRequestException('Schedule amountUsd must be greater than 0');
    }

    const rateBcv = dto.rateBcv;
    const amountBs = amountUsd * rateBcv;

    const movement = await this.prisma.financeMovement.create({
      data: {
        company: schedule.company,
        producerId: schedule.producerId,
        cropPlanId: null,
        type: 'PAYMENT',
        amountUsd,
        amountBs,
        rateBcv,
        description: `Pago programado (schedule #${schedule.id})`,
        status: 'ACTIVE',
        adminAccountId,
        movementDate: new Date(),
      },
    });

    await this.prisma.administrativeAccount.update({
      where: { id: adminAccountId },
      data: {
        balance: adminAccount.balance - amountUsd,
      },
    });

    await this.prisma.administrativeMovement.create({
      data: {
        accountId: adminAccountId,
        type: AdministrativeMovementType.WITHDRAW,
        amount: amountUsd,
        description: `Pago a productor ${schedule.producerId} (schedule #${schedule.id})`,
        movementDate: new Date(),
      },
    });

    const updatedSchedule = await this.prisma.producerPaymentSchedule.update({
      where: { id: scheduleId },
      data: {
        status: 'EXECUTED',
        financeMovementId: movement.id,
        adminAccountId,
        updatedAt: new Date(),
      },
    });

    return {
      schedule: updatedSchedule,
      movement,
    };
  }

  async createFinancedItem(dto: CreateFinancedItemDto) {
    const { financingPercent, ...rest } = dto;
    const finalFinancingPercent = financingPercent ?? 100;

    return this.prisma.financedItem.create({
      data: {
        ...rest,
        financingPercent: finalFinancingPercent,
      },
    });
  }

  async getCycleFinancedItems(cycleId: number) {
    return this.prisma.financedItem.findMany({
      where: { cycleId },
      orderBy: { id: 'asc' },
    });
  }

  async createCycleExtraCost(dto: CreateCycleExtraCostDto) {
    return this.prisma.cycleExtraCost.create({
      data: {
        ...dto,
      },
    });
  }

  async getCycleExtraCosts(cycleId: number) {
    return this.prisma.cycleExtraCost.findMany({
      where: { cycleId },
      orderBy: { id: 'asc' },
    });
  }

  async getCycleSummary(cycleId: number) {
    const [items, extraCosts] = await this.prisma.$transaction([
      this.prisma.financedItem.findMany({
        where: { cycleId },
      }),
      this.prisma.cycleExtraCost.findMany({
        where: { cycleId },
      }),
    ]);

    let totalCost = 0;
    let totalPrice = 0;
    let totalFinanced = 0;

    const bySupplier = new Map<number, number>();
    const byProducer = new Map<number, number>();
    const byCategory = new Map<string, { totalCost: number; totalFinanced: number }>();

    for (const it of items) {
      const qty = Number(it.quantity ?? 0);
      const unitCost = Number(it.unitCost ?? 0);
      const unitPrice = Number(it.unitPrice ?? 0);
      const percent = Number(it.financingPercent ?? 100) / 100;
      const category = it.category ?? 'UNKNOWN';

      const itemCost = qty * unitCost;
      const itemPrice = qty * unitPrice;
      const itemFinanced = itemPrice * percent;

      totalCost += itemCost;
      totalPrice += itemPrice;
      totalFinanced += itemFinanced;

      if (it.supplierId != null) {
        const prev = bySupplier.get(it.supplierId) ?? 0;
        bySupplier.set(it.supplierId, prev + itemCost);
      }

      if (it.producerId != null) {
        const prev = byProducer.get(it.producerId) ?? 0;
        byProducer.set(it.producerId, prev + itemFinanced);
      }

      const catPrev = byCategory.get(category) ?? { totalCost: 0, totalFinanced: 0 };
      catPrev.totalCost += itemCost;
      catPrev.totalFinanced += itemFinanced;
      byCategory.set(category, catPrev);
    }

    const extraCostsTotal = extraCosts.reduce((acc, ec) => {
      const amount = Number(ec.amountUsd ?? ec.amountBs ?? 0);
      return acc + amount;
    }, 0);

    const totalCycleCost = totalCost + extraCostsTotal;

    const debtBySupplier = Array.from(bySupplier.entries()).map(([supplierId, total]) => ({
      supplierId,
      totalCost: total,
    }));

    const debtByProducer = Array.from(byProducer.entries()).map(([producerId, total]) => ({
      producerId,
      totalFinanced: total,
    }));

    const totalsByCategory = Array.from(byCategory.entries()).map(([category, agg]) => ({
      category,
      totalCost: agg.totalCost,
      totalFinanced: agg.totalFinanced,
    }));

    return {
      cycleId,
      totals: {
        totalCost,
        totalPrice,
        totalFinanced,
        extraCosts: extraCostsTotal,
        totalCycleCost,
      },
      debtBySupplier,
      debtByProducer,
      totalsByCategory,
    };
  }

  async createCycle(dto: CreateFinancingCycleDto) {
    return this.prisma.financingCycle.create({
      data: {
        code: dto.code.trim(),
        name: dto.name?.trim() || null,
        season: dto.season?.trim() || null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: dto.status ?? 'ACTIVE',
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async getCyclesList() {
    const cycles = await this.prisma.financingCycle.findMany({
      orderBy: { code: 'asc' },
    });

    return cycles.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      status: c.status,
    }));
    
  }
  
}
