// src/purchases/purchases.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateAgroHouseDto,
  CreateAgroHouseBankAccountDto,
} from './dto/create-agro-house.dto';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { CreateAgroHousePaymentDto } from './dto/create-agro-house-payment.dto';
import { CreateAgroHouseAttachmentDto } from './dto/create-agro-house-attachment.dto';
import { CreatePurchaseInvoiceAttachmentDto } from './dto/create-purchase-invoice-attachment.dto';
import { CodesService } from 'src/codes/codes.service';
import { applyScopeToWhere } from 'src/auth/apply-scope';

type Scopes = {
  warehouseIds: number[] | null;
  producerIds: number[] | null;
  companies: string[] | null;
};

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codesService: CodesService,
  ) {}

  // =========================
  // Helpers de permisos/scope
  // =========================
  private isAdmin(role?: string) {
    return String(role ?? '').toUpperCase() === 'ADMIN';
  }

  private normalizeScopes(scopes?: Scopes): Scopes {
    return {
      warehouseIds: scopes?.warehouseIds ?? null,
      producerIds: scopes?.producerIds ?? null,
      companies: scopes?.companies ?? null,
    };
  }

  /**
   * Fallback para filtrar por company:
   *  1) intenta where.company
   *  2) si Prisma explota porque el modelo no tiene company, usa agroHouse.company
   */
  private async findManyWithCompanyScope<T>(
    fnDirectCompany: () => Promise<T>,
    fnNestedAgroHouseCompany: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fnDirectCompany();
    } catch (e: any) {
      return await fnNestedAgroHouseCompany();
    }
  }

  private buildCompanyWhereDirect(where: any, scopes?: Scopes, role?: string) {
    if (this.isAdmin(role)) return where ?? {};
    const s = this.normalizeScopes(scopes);
    return applyScopeToWhere(where ?? {}, s, { companyField: 'company' });
  }

  private buildCompanyWhereAgroHouseNested(
    where: any,
    scopes?: Scopes,
    role?: string,
  ) {
    if (this.isAdmin(role)) return where ?? {};
    const s = this.normalizeScopes(scopes);
    if (!s.companies) return where ?? {}; // null => sin restricción
    return {
      ...(where ?? {}),
      agroHouse: {
        ...(where?.agroHouse ?? {}),
        company: { in: s.companies },
      },
    };
  }

  private buildAgroHouseCompanyWhere(where: any, scopes?: Scopes, role?: string) {
    if (this.isAdmin(role)) return where ?? {};
    const s = this.normalizeScopes(scopes);
    if (!s.companies) return where ?? {};
    return {
      ...(where ?? {}),
      company: { in: s.companies },
    };
  }

  private async assertAgroHouseAccess(
    agroHouseId: number,
    scopes?: Scopes,
    role?: string,
  ) {
    const row = await this.prisma.agroHouse.findFirst({
      where: this.buildAgroHouseCompanyWhere({ id: agroHouseId }, scopes, role),
      select: { id: true },
    });

    if (!row) {
      throw new ForbiddenException('Sin acceso a esta casa agrícola');
    }
  }

  private async assertInvoiceAccess(
    invoiceId: number,
    scopes?: Scopes,
    role?: string,
  ) {
    const tryDirect = async () => {
      const row = await this.prisma.purchaseInvoice.findFirst({
        where: this.buildCompanyWhereDirect({ id: invoiceId }, scopes, role),
        select: { id: true },
      });
      if (!row) throw new ForbiddenException('Sin acceso a esta factura');
    };

    const tryNested = async () => {
      const row = await this.prisma.purchaseInvoice.findFirst({
        where: this.buildCompanyWhereAgroHouseNested({ id: invoiceId }, scopes, role),
        select: { id: true },
      });
      if (!row) throw new ForbiddenException('Sin acceso a esta factura');
    };

    await this.findManyWithCompanyScope(tryDirect, tryNested);
  }

  // =========================
  // Agro Houses
  // =========================

  async createAgroHouse(dto: CreateAgroHouseDto, scopes?: Scopes, role?: string) {
    const agroHouseCode = await this.codesService.generateCode('AGROHOUSE');

    const bankAccountsData = dto.bankAccounts?.map((acc) => ({
      bankName: acc.bankName,
      accountNumber: acc.accountNumber,
      accountType: acc.accountType,
      currency: acc.currency,
      holderName: acc.holderName,
      holderId: acc.holderId,
      isPrimary: acc.isPrimary ?? false,
    }));

    return this.prisma.agroHouse.create({
      data: {
        code: agroHouseCode,
        name: dto.name,
        rif: dto.rif,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        bankAccounts: bankAccountsData ? { create: bankAccountsData } : undefined,
      },
      include: {
        bankAccounts: true,
        attachments: true,
      },
    });
  }

  async findAllAgroHouses(scopes?: Scopes, role?: string) {
    const where = this.buildAgroHouseCompanyWhere({}, scopes, role);

    return this.prisma.agroHouse.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        bankAccounts: true,
        attachments: true,
      },
    });
  }

  async addBankAccountToAgroHouse(
    agroHouseId: number,
    dto: CreateAgroHouseBankAccountDto,
    scopes?: Scopes,
    role?: string,
  ) {
    await this.assertAgroHouseAccess(agroHouseId, scopes, role);

    const house = await this.prisma.agroHouse.findUnique({
      where: { id: agroHouseId },
    });

    if (!house) {
      throw new NotFoundException(
        `Casa agrícola con id ${agroHouseId} no existe`,
      );
    }

    return this.prisma.agroHouseBankAccount.create({
      data: {
        agroHouseId,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        accountType: dto.accountType,
        currency: dto.currency,
        holderName: dto.holderName,
        holderId: dto.holderId,
        isPrimary: dto.isPrimary ?? false,
      },
    });
  }

  async getBankAccountsByAgroHouse(
    agroHouseId: number,
    scopes?: Scopes,
    role?: string,
  ) {
    await this.assertAgroHouseAccess(agroHouseId, scopes, role);

    return this.prisma.agroHouseBankAccount.findMany({
      where: { agroHouseId },
      orderBy: { id: 'asc' },
    });
  }

  async addAttachmentToAgroHouse(
    agroHouseId: number,
    dto: CreateAgroHouseAttachmentDto,
    scopes?: Scopes,
    role?: string,
  ) {
    await this.assertAgroHouseAccess(agroHouseId, scopes, role);

    const house = await this.prisma.agroHouse.findUnique({
      where: { id: agroHouseId },
    });

    if (!house) {
      throw new NotFoundException(
        `Casa agrícola con id ${agroHouseId} no existe`,
      );
    }

    const attachmentCode = await this.codesService.generateCode(
      'AGROHOUSE_ATTACHMENT',
    );

    return this.prisma.agroHouseAttachment.create({
      data: {
        code: attachmentCode,
        agroHouseId,
        fileName: dto.fileName,
        url: dto.url,
        fileType: dto.fileType,
        category: dto.category,
        description: dto.description,
      },
    });
  }

  async getAttachmentsByAgroHouse(
    agroHouseId: number,
    scopes?: Scopes,
    role?: string,
  ) {
    await this.assertAgroHouseAccess(agroHouseId, scopes, role);

    return this.prisma.agroHouseAttachment.findMany({
      where: { agroHouseId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  // =========================
  // Purchase Invoices
  // =========================

  async createPurchaseInvoice(
    dto: CreatePurchaseInvoiceDto,
    scopes?: Scopes,
    role?: string,
  ) {
    await this.assertAgroHouseAccess(dto.agroHouseId, scopes, role);

    const totalAmount = dto.items.reduce(
      (acc, item) => acc + item.quantity * item.unitPrice,
      0,
    );

    const invoiceCode = await this.codesService.generateCode('PURCHASE_INVOICE');

    const itemsData: {
      code: string;
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      total: number;
    }[] = [];

    for (const item of dto.items) {
      const itemCode = await this.codesService.generateCode('PURCHASE_ITEM');
      itemsData.push({
        code: itemCode,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      });
    }

    return this.prisma.purchaseInvoice.create({
      data: {
        code: invoiceCode,
        agroHouseId: dto.agroHouseId,
        cycleId: dto.cycleId,
        invoiceNumber: dto.invoiceNumber,
        invoiceDate: new Date(dto.invoiceDate),
        currency: dto.currency,
        totalAmount,
        items: { create: itemsData },
      },
      include: {
        items: true,
        agroHouse: true,
      },
    });
  }

  // =========================
  // Payments
  // =========================

  async createAgroHousePayment(
    dto: CreateAgroHousePaymentDto,
    scopes?: Scopes,
    role?: string,
  ) {
    await this.assertAgroHouseAccess(dto.agroHouseId, scopes, role);

    if (dto.purchaseInvoiceId) {
      await this.assertInvoiceAccess(dto.purchaseInvoiceId, scopes, role);

      const invoice = await this.prisma.purchaseInvoice.findUnique({
        where: { id: dto.purchaseInvoiceId },
      });

      if (!invoice) {
        throw new NotFoundException(
          `Factura de compra #${dto.purchaseInvoiceId} no existe`,
        );
      }
    }

    const paymentCode = await this.codesService.generateCode('AGROHOUSE_PAYMENT');

    return this.prisma.agroHousePayment.create({
      data: {
        code: paymentCode,
        agroHouseId: dto.agroHouseId,
        purchaseInvoiceId: dto.purchaseInvoiceId,
        cycleId: dto.cycleId,
        paymentDate: new Date(dto.paymentDate),
        amountUsd: dto.amountUsd,
        method: dto.method,
        reference: dto.reference,
      },
      include: {
        agroHouse: true,
        purchaseInvoice: true,
      },
    });
  }

  // =========================
  // Summary by cycle  ✅ FIX DEFINITIVO GROUPBY
  // =========================

  async getAgroHousesSummaryByCycle(
    cycleId: number,
    scopes?: Scopes,
    role?: string,
  ) {
    const invoicesByHouse = await this.findManyWithCompanyScope(
      async () => {
        const where = this.buildCompanyWhereDirect({ cycleId }, scopes, role);
        return (this.prisma.purchaseInvoice as any).groupBy({
          by: ['agroHouseId'],
          where,
          _sum: { totalAmount: true },
        });
      },
      async () => {
        const where = this.buildCompanyWhereAgroHouseNested({ cycleId }, scopes, role);
        return (this.prisma.purchaseInvoice as any).groupBy({
          by: ['agroHouseId'],
          where,
          _sum: { totalAmount: true },
        });
      },
    );

    const paymentsByHouse = await this.findManyWithCompanyScope(
      async () => {
        const where = this.buildCompanyWhereDirect({ cycleId }, scopes, role);
        return (this.prisma.agroHousePayment as any).groupBy({
          by: ['agroHouseId'],
          where,
          _sum: { amountUsd: true },
        });
      },
      async () => {
        const where = this.buildCompanyWhereAgroHouseNested({ cycleId }, scopes, role);
        return (this.prisma.agroHousePayment as any).groupBy({
          by: ['agroHouseId'],
          where,
          _sum: { amountUsd: true },
        });
      },
    );

    const agroHouseIds = Array.from(
      new Set([
        ...invoicesByHouse.map((i: any) => i.agroHouseId),
        ...paymentsByHouse.map((p: any) => p.agroHouseId),
      ]),
    );

    if (agroHouseIds.length === 0) return [];

    const agroHouses = await this.prisma.agroHouse.findMany({
      where: this.buildAgroHouseCompanyWhere({ id: { in: agroHouseIds } }, scopes, role),
      select: { id: true, name: true, rif: true },
    });

    return agroHouseIds.map((id) => {
      const house = agroHouses.find((h: any) => h.id === id);
      const inv = invoicesByHouse.find((i: any) => i.agroHouseId === id);
      const pay = paymentsByHouse.find((p: any) => p.agroHouseId === id);

      const totalInvoicedUsd = inv?._sum?.totalAmount ?? 0;
      const totalPaidUsd = pay?._sum?.amountUsd ?? 0;
      const balanceUsd = totalInvoicedUsd - totalPaidUsd;

      return {
        agroHouseId: id,
        name: house?.name ?? 'Sin nombre',
        rif: house?.rif ?? null,
        totalInvoicedUsd,
        totalPaidUsd,
        balanceUsd,
      };
    });
  }

  // =========================
  // Attachments Invoice
  // =========================

  async addAttachmentToPurchaseInvoice(
    invoiceId: number,
    dto: CreatePurchaseInvoiceAttachmentDto,
    scopes?: Scopes,
    role?: string,
  ) {
    await this.assertInvoiceAccess(invoiceId, scopes, role);

    const invoice = await this.prisma.purchaseInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(
        `Factura de compra con id ${invoiceId} no existe`,
      );
    }

    const attachmentCode = await this.codesService.generateCode(
      'PURCHASE_INVOICE_ATTACHMENT',
    );

    return this.prisma.purchaseInvoiceAttachment.create({
      data: {
        code: attachmentCode,
        purchaseInvoiceId: invoiceId,
        fileName: dto.fileName,
        url: dto.url,
        fileType: dto.fileType,
        category: dto.category,
        description: dto.description,
      },
    });
  }

  async getAttachmentsByPurchaseInvoice(
    invoiceId: number,
    scopes?: Scopes,
    role?: string,
  ) {
    await this.assertInvoiceAccess(invoiceId, scopes, role);

    return this.prisma.purchaseInvoiceAttachment.findMany({
      where: { purchaseInvoiceId: invoiceId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  // =========================
  // History by AgroHouse
  // =========================

  async getPurchaseHistoryByAgroHouse(
    agroHouseId: number,
    cycleId?: number,
    scopes?: Scopes,
    role?: string,
  ) {
    await this.assertAgroHouseAccess(agroHouseId, scopes, role);

    const where: any = { agroHouseId };
    if (typeof cycleId === 'number') where.cycleId = cycleId;

    const invoices = await this.prisma.purchaseInvoice.findMany({
      where,
      orderBy: [{ invoiceDate: 'asc' }, { id: 'asc' }],
      include: {
        items: true,
        payments: true,
      },
    });

    return invoices.map((inv: any) => {
      const totalPaidUsd =
        inv.payments?.reduce(
          (sum: number, p: any) => sum + (p.amountUsd ?? 0),
          0,
        ) ?? 0;

      const balanceUsd = (inv.totalAmount ?? 0) - totalPaidUsd;

      return {
        id: inv.id,
        cycleId: inv.cycleId,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        currency: inv.currency,
        totalAmount: inv.totalAmount,
        totalPaidUsd,
        balanceUsd,
        items: inv.items,
        payments: inv.payments,
      };
    });
  }

  // =========================
  // Statement by AgroHouse
  // =========================

  async getAgroHouseStatement(
    agroHouseId: number,
    cycleId?: number,
    scopes?: Scopes,
    role?: string,
  ) {
    await this.assertAgroHouseAccess(agroHouseId, scopes, role);

    const invoiceWhere: any = { agroHouseId };
    const paymentWhere: any = { agroHouseId };

    if (typeof cycleId === 'number') {
      invoiceWhere.cycleId = cycleId;
      paymentWhere.cycleId = cycleId;
    }

    const [invoices, payments] = await Promise.all([
      this.prisma.purchaseInvoice.findMany({
        where: invoiceWhere,
        orderBy: [{ invoiceDate: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.agroHousePayment.findMany({
        where: paymentWhere,
        orderBy: [{ paymentDate: 'asc' }, { id: 'asc' }],
      }),
    ]);

    type StatementLine = {
      date: Date;
      type: 'INVOICE' | 'PAYMENT';
      reference: string;
      description: string;
      debitUsd: number;
      creditUsd: number;
      balanceUsd: number;
      invoiceId?: number;
      paymentId?: number;
      cycleId?: number;
    };

    const lines: StatementLine[] = [];

    for (const inv of invoices as any[]) {
      lines.push({
        date: inv.invoiceDate,
        type: 'INVOICE',
        reference: inv.invoiceNumber,
        description: `Factura de compra #${inv.invoiceNumber}`,
        debitUsd: inv.totalAmount ?? 0,
        creditUsd: 0,
        balanceUsd: 0,
        invoiceId: inv.id,
        cycleId: inv.cycleId,
      });
    }

    for (const pay of payments as any[]) {
      lines.push({
        date: pay.paymentDate,
        type: 'PAYMENT',
        reference: pay.reference ?? '',
        description: `Pago a casa agrícola${
          pay.purchaseInvoiceId ? ` (factura ${pay.purchaseInvoiceId})` : ''
        }`,
        debitUsd: 0,
        creditUsd: pay.amountUsd ?? 0,
        balanceUsd: 0,
        paymentId: pay.id,
        cycleId: pay.cycleId,
      });
    }

    lines.sort((a, b) => {
      const diff = a.date.getTime() - b.date.getTime();
      if (diff !== 0) return diff;
      if (a.type === b.type) return 0;
      return a.type === 'INVOICE' ? -1 : 1;
    });

    let runningBalance = 0;
    const withBalance = lines.map((line) => {
      runningBalance += line.debitUsd - line.creditUsd;
      return { ...line, balanceUsd: runningBalance };
    });

    const house = await this.prisma.agroHouse.findUnique({
      where: { id: agroHouseId },
    });
    if (!house) {
      throw new NotFoundException(
        `Casa agrícola con id ${agroHouseId} no existe`,
      );
    }

    return {
      agroHouse: {
        id: house.id,
        name: house.name,
        rif: house.rif,
      },
      cycleId: cycleId ?? null,
      initialBalanceUsd: 0,
      finalBalanceUsd: runningBalance,
      lines: withBalance,
    };
  }
}
