import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CodesModule } from 'src/codes/codes.module';

import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

// ✅ IMPORTA EL MÓDULO (no el service)
import { PricingModule } from 'src/settings/pricing/pricing.module';

@Module({
  imports: [
    PrismaModule,
    CodesModule,
    PricingModule, // ✅ aquí queda disponible PricingService por export
  ],
  controllers: [SalesController], // ✅ SOLO controllers aquí
  providers: [SalesService],
})
export class SalesModule {}
