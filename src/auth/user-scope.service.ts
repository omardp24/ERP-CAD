import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserScopeService {
  constructor(private prisma: PrismaService) {}

  async getScopes(userId: number) {
    const [warehouses, producers, companies] = await Promise.all([
      this.prisma.userWarehouseAccess.findMany({
        where: { userId },
        select: { warehouseId: true },
      }),
      this.prisma.userProducerAccess.findMany({
        where: { userId },
        select: { producerId: true },
      }),
      this.prisma.userCompanyAccess.findMany({
        where: { userId },
        select: { company: true },
      }),
    ]);

    return {
      warehouseIds: warehouses.length ? warehouses.map(w => w.warehouseId) : null,
      producerIds: producers.length ? producers.map(p => p.producerId) : null,
      companies: companies.length ? companies.map(c => c.company) : null,
    };
  }
}
