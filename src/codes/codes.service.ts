// src/codes/codes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CodeResetPolicy } from '@prisma/client';

@Injectable()
export class CodesService {
  constructor(private readonly prisma: PrismaService) {}

  async generateCode(sequenceKey: string): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      let sequence = await tx.codeSequence.findUnique({
        where: { key: sequenceKey },
      });

      if (!sequence || !sequence.isActive) {
        throw new NotFoundException(
          `No existe secuencia de código activa para key=${sequenceKey}`,
        );
      }

      const now = new Date();
      const mustReset = this.shouldReset(sequence.resetPolicy, sequence.lastResetAt, now);

      if (mustReset) {
        sequence = await tx.codeSequence.update({
          where: { key: sequenceKey },
          data: {
            currentValue: 0,
            lastResetAt: now,
          },
        });
      }

      sequence = await tx.codeSequence.update({
        where: { key: sequenceKey },
        data: { currentValue: { increment: 1 } },
      });

      const number = sequence.currentValue;
      const prefix = this.buildPrefix(sequence.prefix, sequence.resetPolicy, now);
      const padded = this.padNumber(number, sequence.padding);
      const suffix = sequence.suffix ?? '';

      return `${prefix}${padded}${suffix}`;
    });
  }

  /**
   * ✅ Wrapper para ventas (FACTURA/PROFORMA/NOTA_ENTREGA)
   * Usa CodeSequence.key:
   *  - SALE_FV  => prefix "FV-"
   *  - SALE_PR  => prefix "PR-"
   *  - SALE_NE  => prefix "NE-"
   */
  async nextSaleCode(documentType: 'FACTURA' | 'PROFORMA' | 'NOTA_ENTREGA'): Promise<string> {
    const key = this.getSaleSequenceKey(documentType);
    return this.generateCode(key);
  }

  private getSaleSequenceKey(documentType: string): string {
    switch (documentType) {
      case 'FACTURA':
        return 'SALE_FV';
      case 'PROFORMA':
        return 'SALE_PR';
      case 'NOTA_ENTREGA':
        return 'SALE_NE';
      default:
        return 'SALE_FV';
    }
  }

  private shouldReset(
    policy: CodeResetPolicy,
    lastResetAt: Date | null,
    now: Date,
  ): boolean {
    if (!lastResetAt) return policy !== CodeResetPolicy.NEVER;

    switch (policy) {
      case CodeResetPolicy.NEVER:
        return false;
      case CodeResetPolicy.YEARLY:
        return now.getFullYear() !== lastResetAt.getFullYear();
      case CodeResetPolicy.MONTHLY:
        return (
          now.getFullYear() !== lastResetAt.getFullYear() ||
          now.getMonth() !== lastResetAt.getMonth()
        );
      case CodeResetPolicy.DAILY:
        return (
          now.getFullYear() !== lastResetAt.getFullYear() ||
          now.getMonth() !== lastResetAt.getMonth() ||
          now.getDate() !== lastResetAt.getDate()
        );
      default:
        return false;
    }
  }

  private buildPrefix(
    basePrefix: string | null,
    policy: CodeResetPolicy,
    now: Date,
  ): string {
    const prefix = basePrefix ?? '';

    if (policy === CodeResetPolicy.YEARLY) {
      const year = now.getFullYear();
      return `${prefix}${year}-`;
    }

    if (policy === CodeResetPolicy.MONTHLY) {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      return `${prefix}${year}${month}-`;
    }

    return prefix;
  }

  private padNumber(num: number, padding: number): string {
    return String(num).padStart(padding, '0');
  }
}
