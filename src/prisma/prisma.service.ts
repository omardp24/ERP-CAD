import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private keepAliveInterval: NodeJS.Timeout | null = null;

  constructor() {
    super({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
    this.startKeepAlive();
  }

  async onModuleDestroy() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    await this.$disconnect();
  }

  // ✅ Conexión con reintentos automáticos
  private async connectWithRetry(retries = 5, delayMs = 3000) {
    for (let i = 1; i <= retries; i++) {
      try {
        await this.$connect();
        this.logger.log('✅ Conectado a la base de datos');
        return;
      } catch (err) {
        this.logger.warn(`⚠️ Intento ${i}/${retries} fallido. Reintentando en ${delayMs}ms...`);
        if (i === retries) {
          this.logger.error('❌ No se pudo conectar a la base de datos');
          throw err;
        }
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  // ✅ Keep-alive: hace un ping cada 4 minutos para evitar que Supabase cierre la conexión
  private startKeepAlive() {
    this.keepAliveInterval = setInterval(async () => {
      try {
        await this.$queryRaw`SELECT 1`;
      } catch (err) {
        this.logger.warn('⚠️ Keep-alive falló, reconectando...');
        try {
          await this.$disconnect();
          await this.connectWithRetry(3, 2000);
        } catch (reconnectErr) {
          this.logger.error('❌ Error al reconectar:', reconnectErr);
        }
      }
    }, 4 * 60 * 1000); // cada 4 minutos
  }
}