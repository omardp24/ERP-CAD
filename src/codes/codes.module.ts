import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CodesService } from './codes.service';

@Module({
  imports: [PrismaModule],
  providers: [CodesService],
  exports: [CodesService],
})
export class CodesModule {}
