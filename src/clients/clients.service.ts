import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(search?: string) {
    const q = search?.trim();
    return this.prisma.clients.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { rif: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: { id: 'desc' },
      take: 50,
    });
  }

  async create(dto: CreateClientDto) {
    return this.prisma.clients.create({ data: dto as any });
  }
}
