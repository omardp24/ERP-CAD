// src/inventory/inventory.module.ts
import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [InventoryService, PrismaService],
  controllers: [InventoryController],
})
export class InventoryModule {}
