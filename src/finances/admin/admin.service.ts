import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdministrativeAccount,
  AdministrativeMovement,
  AdministrativeMovementType,
  AdministrativeTransfer,
  AdministrativeAuditAction,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdminAccountDto } from './dto/create-admin-account.dto';
import { CreateAdminMovementDto } from './dto/create-admin-movement.dto';
import { CreateAdminTransferDto } from './dto/create-admin-transfer.dto';
import { GetAdminAuditLogsDto } from '../dto/get-admin-audit-logs.dto';

@Injectable()
export class AdminFinancesService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================
  //        CUENTAS
  // ============================

  async createAccount(
    dto: CreateAdminAccountDto,
    user?: any,
  ): Promise<AdministrativeAccount> {
    const initialBalance = dto.balance ?? 0;

    const account = await this.prisma.administrativeAccount.create({
      data: {
        name: dto.name,
        currency: dto.currency,
        type: dto.type,
        balance: initialBalance,
      },
    });

    // Auditoría: creación de cuenta
    await this.audit({
      action: AdministrativeAuditAction.CREATE_ACCOUNT,
      entityType: 'ACCOUNT',
      entityId: account.id,
      accountId: account.id,
      user,
      metadata: {
        name: account.name,
        currency: account.currency,
        type: account.type,
        balance: account.balance,
      },
    });

    return account;
  }

  async findAllAccounts(): Promise<AdministrativeAccount[]> {
    return this.prisma.administrativeAccount.findMany({
      where: { active: true },
      orderBy: { id: 'asc' },
    });
  }

  async findAccountById(id: number): Promise<AdministrativeAccount> {
    const account = await this.prisma.administrativeAccount.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException(`Cuenta administrativa ${id} no encontrada`);
    }

    return account;
  }

  // ============================
  //        MOVIMIENTOS
  // ============================

  async createMovement(
    dto: CreateAdminMovementDto,
    user?: any,
  ): Promise<{ movement: AdministrativeMovement; newBalance: number }> {
    const account = await this.findAccountById(dto.accountId);

    if (!account.active) {
      throw new BadRequestException('La cuenta está inactiva');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    // Determinar si suma o resta al balance
    let signedAmount = dto.amount;
    if (dto.type === AdministrativeMovementType.WITHDRAW) {
      signedAmount = -dto.amount;
    } else if (dto.type === AdministrativeMovementType.ADJUST) {
      // Por ahora tratamos ADJUST como suma (podemos mejorarlo luego)
      signedAmount = dto.amount;
    }

    const newBalance = account.balance + signedAmount;

    if (newBalance < 0) {
      throw new BadRequestException(
        'La cuenta no tiene saldo suficiente para este movimiento',
      );
    }

    const [updatedAccount, movement] = await this.prisma.$transaction([
      this.prisma.administrativeAccount.update({
        where: { id: account.id },
        data: { balance: newBalance },
      }),
      this.prisma.administrativeMovement.create({
        data: {
          accountId: account.id,
          type: dto.type,
          amount: dto.amount,
          description: dto.description,
        },
      }),
    ]);

    // Auditoría: creación de movimiento
    await this.audit({
      action: AdministrativeAuditAction.CREATE_MOVEMENT,
      entityType: 'MOVEMENT',
      entityId: movement.id,
      accountId: movement.accountId,
      user,
      metadata: {
        type: movement.type,
        amount: movement.amount,
        description: movement.description,
        newBalance: updatedAccount.balance,
      },
    });

    return { movement, newBalance: updatedAccount.balance };
  }

  async getMovementsByAccount(
    accountId: number,
  ): Promise<AdministrativeMovement[]> {
    await this.findAccountById(accountId);

    return this.prisma.administrativeMovement.findMany({
      where: { accountId },
      orderBy: { movementDate: 'desc' },
    });
  }

  // ============================
  //        TRANSFERENCIAS
  // ============================

  async createTransfer(
    dto: CreateAdminTransferDto,
    user?: any,
  ): Promise<AdministrativeTransfer> {
    if (dto.amount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException(
        'Las cuentas origen y destino deben ser distintas',
      );
    }

    const fromAccount = await this.findAccountById(dto.fromAccountId);
    const toAccount = await this.findAccountById(dto.toAccountId);

    if (!fromAccount.active || !toAccount.active) {
      throw new BadRequestException('Alguna de las cuentas está inactiva');
    }

    if (fromAccount.currency !== toAccount.currency) {
      throw new BadRequestException(
        'Las cuentas deben estar en la misma moneda para transferencias directas',
      );
    }

    if (fromAccount.balance < dto.amount) {
      throw new BadRequestException(
        'La cuenta origen no tiene saldo suficiente',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedFrom = await tx.administrativeAccount.update({
        where: { id: fromAccount.id },
        data: { balance: fromAccount.balance - dto.amount },
      });

      const updatedTo = await tx.administrativeAccount.update({
        where: { id: toAccount.id },
        data: { balance: toAccount.balance + dto.amount },
      });

      const transfer = await tx.administrativeTransfer.create({
        data: {
          fromAccountId: fromAccount.id,
          toAccountId: toAccount.id,
          amount: dto.amount,
          description: dto.description,
        },
      });

      await tx.administrativeMovement.create({
        data: {
          accountId: fromAccount.id,
          type: AdministrativeMovementType.WITHDRAW,
          amount: dto.amount,
          description:
            dto.description ??
            `Transferencia a cuenta ${toAccount.name} (ID: ${toAccount.id})`,
          transferId: transfer.id,
        },
      });

      await tx.administrativeMovement.create({
        data: {
          accountId: toAccount.id,
          type: AdministrativeMovementType.DEPOSIT,
          amount: dto.amount,
          description:
            dto.description ??
            `Transferencia desde cuenta ${fromAccount.name} (ID: ${fromAccount.id})`,
          transferId: transfer.id,
        },
      });

      // Auditoría: creación de transferencia
      await this.audit({
        action: AdministrativeAuditAction.CREATE_TRANSFER,
        entityType: 'TRANSFER',
        entityId: transfer.id,
        accountId: null,
        user,
        metadata: {
          fromAccountId: fromAccount.id,
          toAccountId: toAccount.id,
          amount: dto.amount,
          description: dto.description,
          fromBalanceAfter: updatedFrom.balance,
          toBalanceAfter: updatedTo.balance,
        },
      });

      return transfer;
    });

    return result;
  }

  // ============================
  //        AUDITORÍA
  // ============================

  private async audit(params: {
    action: AdministrativeAuditAction;
    entityType: string;
    entityId?: number;
    accountId?: number | null;
    user?: any;
    metadata?: Record<string, any>;
  }) {
    const { action, entityType, entityId, accountId, user, metadata } = params;

    await this.prisma.administrativeAuditLog.create({
      data: {
        action,
        entityType,
        entityId,
        accountId: accountId ?? null,
        userId: user?.id ?? user?.sub ?? null,
        userEmail: user?.email ?? null,
        metadata,
      },
    });
  }

  async getAdministrativeAuditLogs(filters: GetAdminAuditLogsDto) {
  const {
    userId,
    entityId,
    action,
    from,
    to,
    page = 1,
    pageSize = 25,
  } = filters;

  const where: Prisma.AdministrativeAuditLogWhereInput = {};

  // 👇 aseguramos que sean números, por si vienen como string
  const userIdNumber =
    userId !== undefined && userId !== null ? Number(userId) : undefined;
  const entityIdNumber =
    entityId !== undefined && entityId !== null ? Number(entityId) : undefined;

  if (userIdNumber !== undefined && !Number.isNaN(userIdNumber)) {
    where.userId = userIdNumber;
  }

  if (entityIdNumber !== undefined && !Number.isNaN(entityIdNumber)) {
    where.entityId = entityIdNumber;
  }

  if (action) {
    where.action = action as any;
  }

  if (from || to) {
    where.createdAt = {};
    if (from) {
      where.createdAt.gte = new Date(from);
    }
    if (to) {
      where.createdAt.lte = new Date(to);
    }
  }

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const [data, total] = await this.prisma.$transaction([
    this.prisma.administrativeAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    this.prisma.administrativeAuditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
    },
  };
}
}