// src/clients/clients.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== LIST =====
  async list(params: { search?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, Number(params.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize || 50)));
    const skip = (page - 1) * pageSize;
    const q = params.search?.trim();

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as any } },
            { rif: { contains: q, mode: 'insensitive' as any } },
            { email: { contains: q, mode: 'insensitive' as any } },
            { phone: { contains: q, mode: 'insensitive' as any } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.clients.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.clients.count({ where }),
    ]);

    return { page, pageSize, total, rows };
  }

  // ===== GET ONE =====
  async getById(id: number) {
    const client = await this.prisma.clients.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return client;
  }

  // ===== CREATE =====
  async create(dto: CreateClientDto) {
    const dtoAny = dto as any;

    if (dtoAny.rif) {
      const existing = await this.prisma.clients.findFirst({
        where: { rif: dtoAny.rif },
      });
      if (existing) {
        throw new BadRequestException(`Ya existe un cliente con el RIF ${dtoAny.rif}`);
      }
    }

    return this.prisma.clients.create({ data: dto as any });
  }

  // ===== UPDATE =====
  async update(id: number, dto: Partial<CreateClientDto>) {
    const client = await this.prisma.clients.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Cliente no encontrado');

    const dtoAny = dto as any;

    if (dtoAny.rif && dtoAny.rif !== client.rif) {
      const existing = await this.prisma.clients.findFirst({
        where: { rif: dtoAny.rif, id: { not: id } },
      });
      if (existing) {
        throw new BadRequestException(`Ya existe otro cliente con el RIF ${dtoAny.rif}`);
      }
    }

    return this.prisma.clients.update({
      where: { id },
      data: dto as any,
    });
  }

  // ===== DELETE =====
  async remove(id: number) {
    const client = await this.prisma.clients.findUnique({
      where: { id },
      include: { sales: true, SaleInvoice: true },
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');

    if (client.sales.length > 0 || client.SaleInvoice.length > 0) {
      throw new BadRequestException(
        'No puedes eliminar un cliente que tiene ventas registradas.',
      );
    }

    await this.prisma.clients.delete({ where: { id } });
    return { ok: true, message: 'Cliente eliminado correctamente.' };
  }

  // ===== STATS =====
  async getStats(id: number) {
    const client = await this.prisma.clients.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Cliente no encontrado');

    const invoices = await this.prisma.saleInvoice.findMany({
      where: { clientId: id, status: 'CONFIRMED' },
      include: { payments: true },
    });

    const totalFacturas = invoices.length;
    const totalVentasUsd = invoices.reduce((acc, s) => acc + Number(s.totalUsd), 0);
    const totalCobradoUsd = invoices.reduce(
      (acc, s) => acc + s.payments.reduce((a, p) => a + Number(p.amountUsd), 0),
      0,
    );
    const totalPendienteUsd = totalVentasUsd - totalCobradoUsd;

    const porEstado = {
      PAID: invoices.filter((s) => s.paymentStatus === 'PAID').length,
      PARTIAL: invoices.filter((s) => s.paymentStatus === 'PARTIAL').length,
      PENDING: invoices.filter((s) => s.paymentStatus === 'PENDING').length,
    };

    return {
      client,
      totalFacturas,
      totalVentasUsd: Math.round(totalVentasUsd * 100) / 100,
      totalCobradoUsd: Math.round(totalCobradoUsd * 100) / 100,
      totalPendienteUsd: Math.round(totalPendienteUsd * 100) / 100,
      porEstado,
    };
  }
}