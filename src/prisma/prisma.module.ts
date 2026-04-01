// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // hace que PrismaService esté disponible en todos los módulos
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
