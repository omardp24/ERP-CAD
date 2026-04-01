import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PricingController],
  providers: [PricingService, PrismaService],
  exports: [PricingService],
})
export class PricingModule {}
