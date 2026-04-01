// src/settings/exchange-rate/exchange-rate.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ExchangeRateService {
  constructor(private readonly prisma: PrismaService) {}

  private toDateOnly(dateStr?: string) {
    // dateStr: YYYY-MM-DD
    const s = dateStr?.trim();
    if (!s) return null;
    const d = new Date(`${s}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  async getToday() {
    const today = new Date();
    // guardamos como Date-only. Para "hoy" usamos YYYY-MM-DD local pero convertido a UTC date-only:
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const dateOnly = new Date(`${y}-${m}-${d}T00:00:00.000Z`);

    const row = await this.prisma.exchangeRate.findUnique({
      where: { date: dateOnly },
    });

    if (!row) return null;

    return {
      date: `${y}-${m}-${d}`,
      rate: Number(row.rate),
    };
  }

  async upsert(body: { date: string; rate: number }) {
    const dateOnly = this.toDateOnly(body.date);
    const rate = Number(body.rate);

    if (!dateOnly) throw new BadRequestException('Fecha inválida (usa YYYY-MM-DD)');
    if (!Number.isFinite(rate) || rate <= 0) throw new BadRequestException('Tasa inválida');

    const row = await this.prisma.exchangeRate.upsert({
      where: { date: dateOnly },
      update: { rate: new Prisma.Decimal(rate) },
      create: { date: dateOnly, rate: new Prisma.Decimal(rate) },
    });

    return { date: body.date, rate: Number(row.rate) };
  }
}
