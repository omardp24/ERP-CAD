import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

import { FinancesService } from './finances.service';
import { FinancesController } from './finances.controller';

import { FinancingPlansService } from './financing-plans.service';
import { FinancingPlansController } from './financing-plans.controller';

// si tienes cosas de "admin", déjalas también importadas aquí
// import { AdminFinancesController } from './admin/admin-finances.controller';
// import { AdminFinancesService } from './admin/admin-finances.service';

@Module({
  controllers: [
    FinancesController,
    FinancingPlansController,
    // AdminFinancesController,
  ],
  providers: [
    PrismaService,
    FinancesService,
    FinancingPlansService,
    // AdminFinancesService,
  ],
})
export class FinancesModule {}
