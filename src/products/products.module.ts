// src/products/products.module.ts
import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CodesModule } from 'src/codes/codes.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, CodesModule, AuthModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
