import { PrismaClient, CodeResetPolicy } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ✅ Secuencias base del sistema
  const sequences = [
    // ===== INVENTARIO / MAESTROS =====
    {
      key: 'PRODUCT',
      description: 'Códigos de productos',
      prefix: 'PRD-',
      padding: 5,
      suffix: null,
      currentValue: 0,
      resetPolicy: CodeResetPolicy.NEVER,
      isActive: true,
      lastResetAt: null,
    },

    // 👇 OJO: tú en ProducersService estás usando 'ALLY'
    {
      key: 'ALLY',
      description: 'Códigos de productores/aliados',
      prefix: 'ALI-',
      padding: 5,
      suffix: null,
      currentValue: 0,
      resetPolicy: CodeResetPolicy.NEVER,
      isActive: true,
      lastResetAt: null,
    },

    // (opcional) si en otros lados usas PRODUCER, lo dejamos también:
    {
      key: 'PRODUCER',
      description: 'Códigos de productores (alias de ALLY)',
      prefix: 'ALI-',
      padding: 5,
      suffix: null,
      currentValue: 0,
      resetPolicy: CodeResetPolicy.NEVER,
      isActive: true,
      lastResetAt: null,
    },

    // ===== COMPRAS =====
    {
      key: 'PURCHASE_INVOICE',
      description: 'Facturas de compra',
      prefix: 'FC-',
      padding: 6,
      suffix: null,
      currentValue: 0,
      resetPolicy: CodeResetPolicy.NEVER,
      isActive: true,
      lastResetAt: null,
    },
    {
      key: 'PURCHASE_ITEM',
      description: 'Ítems de factura de compra',
      prefix: 'FCI-',
      padding: 6,
      suffix: null,
      currentValue: 0,
      resetPolicy: CodeResetPolicy.NEVER,
      isActive: true,
      lastResetAt: null,
    },
    {
      key: 'PURCHASE_INVOICE_ATTACHMENT',
      description: 'Adjuntos de facturas de compra',
      prefix: 'FCA-',
      padding: 6,
      suffix: null,
      currentValue: 0,
      resetPolicy: CodeResetPolicy.NEVER,
      isActive: true,
      lastResetAt: null,
    },

    // ===== CASAS AGRÍCOLAS =====
    {
      key: 'AGROHOUSE',
      description: 'Casas agrícolas',
      prefix: 'CA-',
      padding: 5,
      suffix: null,
      currentValue: 0,
      resetPolicy: CodeResetPolicy.NEVER,
      isActive: true,
      lastResetAt: null,
    },
    {
      key: 'AGROHOUSE_ATTACHMENT',
      description: 'Adjuntos de casas agrícolas',
      prefix: 'CAA-',
      padding: 6,
      suffix: null,
      currentValue: 0,
      resetPolicy: CodeResetPolicy.NEVER,
      isActive: true,
      lastResetAt: null,
    },
    {
      key: 'AGROHOUSE_PAYMENT',
      description: 'Pagos de casas agrícolas',
      prefix: 'CAP-',
      padding: 6,
      suffix: null,
      currentValue: 0,
      resetPolicy: CodeResetPolicy.NEVER,
      isActive: true,
      lastResetAt: null,
    },

    // ===== VENTAS (TU FORMATO: V-YYYY-000001 / P-YYYY-000001 / NE-YYYY-000001) =====
    // OJO: tu CodesService añade "YYYY-" cuando resetPolicy = YEARLY
    {
      key: 'SALE_FV',
      description: 'Ventas - Factura (V-YYYY-000001)',
      prefix: 'V-',
      padding: 6,
      suffix: null,
      currentValue: 0,
      resetPolicy: CodeResetPolicy.YEARLY,
      isActive: true,
      lastResetAt: new Date(), // opcional, sirve para que quede “reseteado” en el año actual
    },
    {
      key: 'SALE_PR',
      description: 'Ventas - Proforma (P-YYYY-000001)',
      prefix: 'P-',
      padding: 6,
      suffix: null,
      currentValue: 0,
      resetPolicy: CodeResetPolicy.YEARLY,
      isActive: true,
      lastResetAt: new Date(),
    },
    {
      key: 'SALE_NE',
      description: 'Ventas - Nota de entrega (NE-YYYY-000001)',
      prefix: 'NE-',
      padding: 6,
      suffix: null,
      currentValue: 0,
      resetPolicy: CodeResetPolicy.YEARLY,
      isActive: true,
      lastResetAt: new Date(),
    },
  ];

  for (const seq of sequences) {
    await prisma.codeSequence.upsert({
      where: { key: seq.key },
      update: {
        description: seq.description,
        prefix: seq.prefix,
        padding: seq.padding,
        suffix: seq.suffix,
        resetPolicy: seq.resetPolicy,
        isActive: seq.isActive,
        // OJO: no sobreescribimos currentValue si ya existe y estás en producción
        // pero en dev sí sirve dejarlo en 0 si quieres:
        // currentValue: seq.currentValue,
      },
      create: seq as any,
    });
  }

  console.log('🚀 Seed OK: secuencias creadas/actualizadas');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
