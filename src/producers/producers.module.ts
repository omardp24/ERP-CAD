import { Module } from '@nestjs/common';
import { ProducersService } from './producers.service';
import { ProducersController } from './producers.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CodesModule } from 'src/codes/codes.module';

@Module({
  controllers: [ProducersController],
  providers: [ProducersService, PrismaService],
})
@Module({
  imports: [CodesModule],
  controllers: [ProducersController],
  providers: [ProducersService, PrismaService],
})

export class ProducersModule {}
