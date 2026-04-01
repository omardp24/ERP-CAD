import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProducerDto } from './dto/create-producer.dto';
import { UpdateProducerDto } from './dto/update-producer.dto';
import { CodesService } from 'src/codes/codes.service';
import { applyScopeToWhere } from 'src/auth/apply-scope';

@Injectable()
export class ProducersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codesService: CodesService,
  ) {}

  async create(dto: CreateProducerDto) {
    const rif = (dto as any).rif ?? (dto as any).documentId ?? null;

    if (rif) {
      const existing = await this.prisma.producers.findFirst({ where: { rif } });
      if (existing) {
        throw new ConflictException({
          message: 'Ya existe un productor con ese documento.',
          existingId: existing.id,
        });
      }
    }

    const composedAddress = [
      (dto as any).address,
      (dto as any).state,
      (dto as any).municipality,
      (dto as any).town,
    ]
      .filter(Boolean)
      .join(' - ')
      .trim();

    const address = composedAddress.length > 0 ? composedAddress : null;

    // OJO: tu seed tenía PRODUCER con prefix 'ALI-'
    // pero acá usas key 'ALLY'. Asegúrate que exista esa key en CodeSequence.
    const code = await this.codesService.generateCode('PRODUCER');

    return this.prisma.producers.create({
      data: {
        code,
        name: dto.name,
        rif,
        phone: (dto as any).phone ?? null,
        email: (dto as any).email ?? null,
        state: (dto as any).state ?? null,
        municipality: (dto as any).municipality ?? null,
        town: (dto as any).town ?? null,
        address,
        totalAreaHa: (dto as any).totalAreaHa ?? null,
        risk_level: (dto as any).riskLevel ?? null,
        status: (dto as any).status ?? undefined,
      },
    });
  }

  // ✅ LISTA (scopes + search)
  async findAll(scopes?: any, search?: string) {
    let where: any = {};

    if (scopes) {
      where = applyScopeToWhere(where, scopes, { producerField: 'id' });
    }

    const q = search?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { rif: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }

    const producers = await this.prisma.producers.findMany({
      where,
      orderBy: { id: 'asc' },
      take: 50,
    });

    return producers.map((p) => ({
      ...p,
      documentId: p.rif,
    }));
  }

  // ✅ GET ONE (respetando scopes)
  async findOne(id: number, scopes?: any) {
    const producer = await this.prisma.producers.findUnique({
      where: { id },
    });

    if (!producer) throw new NotFoundException(`Productor ${id} no encontrado`);

    // Si hay scope restrictivo, verifica que este id sea permitido
    if (scopes) {
      let where: any = { id };
      where = applyScopeToWhere(where, scopes, { producerField: 'id' });

      const allowed = await this.prisma.producers.findFirst({ where });
      if (!allowed) throw new ForbiddenException('No tienes acceso a este productor');
    }

    return { ...producer, documentId: producer.rif };
  }

  async update(id: number, dto: UpdateProducerDto) {
    await this.findOne(id);

    const data: any = {};
    if ((dto as any).name !== undefined) data.name = (dto as any).name;
    if ((dto as any).rif !== undefined) data.rif = (dto as any).rif;
    if ((dto as any).phone !== undefined) data.phone = (dto as any).phone;
    if ((dto as any).email !== undefined) data.email = (dto as any).email;
    if ((dto as any).state !== undefined) data.state = (dto as any).state;
    if ((dto as any).municipality !== undefined) data.municipality = (dto as any).municipality;
    if ((dto as any).town !== undefined) data.town = (dto as any).town;
    if ((dto as any).address !== undefined) data.address = (dto as any).address;
    if ((dto as any).totalAreaHa !== undefined) data.totalAreaHa = (dto as any).totalAreaHa;
    if ((dto as any).riskLevel !== undefined) data.risk_level = (dto as any).riskLevel;
    if ((dto as any).status !== undefined) data.status = (dto as any).status;

    return this.prisma.producers.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.producers.delete({ where: { id } });
  }
}
