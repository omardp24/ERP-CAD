// src/users/users.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserScopesDto } from './dto/update-user-scopes.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitizeUser(u: any) {
    if (!u) return u;
    const { password, ...rest } = u;
    return rest;
  }

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        password: true,
      },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.sanitizeUser(user);
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new BadRequestException('Ya existe un usuario con ese correo');

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashed,
        name: dto.name?.trim() || null,
        role: dto.role ?? UserRole.USER,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.sanitizeUser(user);
  }

  async update(id: number, dto: UpdateUserDto) {
    const current = await this.prisma.user.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Usuario no encontrado');

    const data: any = {};

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      const exists = await this.prisma.user.findUnique({ where: { email } });
      if (exists && exists.id !== id) {
        throw new BadRequestException('Ya existe un usuario con ese correo');
      }
      data.email = email;
    }

    if (dto.name !== undefined) data.name = dto.name ? dto.name.trim() : null;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.sanitizeUser(user);
  }

  // ===== TOGGLE ACTIVE =====
  async toggleActive(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.user.update({
      where: { id },
      data: { active: !user.active },
      select: { id: true, email: true, name: true, active: true },
    });
  }

  // ===== CHANGE PASSWORD =====
  async changePassword(
    id: number,
    dto: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new BadRequestException('La contraseña actual es incorrecta');

    if (dto.newPassword.length < 6) {
      throw new BadRequestException('La nueva contraseña debe tener al menos 6 caracteres');
    }

    await this.prisma.user.update({
      where: { id },
      data: { password: await bcrypt.hash(dto.newPassword, 10) },
    });

    return { ok: true, message: 'Contraseña actualizada correctamente.' };
  }

  // ===== SCOPES =====
  async getScopes(userId: number) {
    await this.findOne(userId);

    const [producerAccess, warehouseAccess, companyAccess] = await this.prisma.$transaction([
      this.prisma.userProducerAccess.findMany({ where: { userId }, select: { producerId: true } }),
      this.prisma.userWarehouseAccess.findMany({ where: { userId }, select: { warehouseId: true } }),
      this.prisma.userCompanyAccess.findMany({ where: { userId }, select: { company: true } }),
    ]);

    const producerIds = producerAccess.map((x) => x.producerId);
    const warehouseIds = warehouseAccess.map((x) => x.warehouseId);
    const companies = companyAccess.map((x) => x.company);

    return {
      allProducers: producerIds.length === 0,
      allWarehouses: warehouseIds.length === 0,
      allCompanies: companies.length === 0,
      producerIds,
      warehouseIds,
      companies,
    };
  }

  async setScopes(userId: number, dto: UpdateUserScopesDto) {
    await this.findOne(userId);

    const allProducers = dto.allProducers ?? false;
    const allWarehouses = dto.allWarehouses ?? false;
    const allCompanies = (dto as any).allCompanies ?? false;

    const producerIds = Array.isArray(dto.producerIds) ? dto.producerIds : [];
    const warehouseIds = Array.isArray(dto.warehouseIds) ? dto.warehouseIds : [];
    const companies = Array.isArray((dto as any).companies) ? (dto as any).companies : [];

    await this.prisma.$transaction(async (tx) => {
      // producers
      await tx.userProducerAccess.deleteMany({ where: { userId } });
      if (!allProducers) {
        const unique = Array.from(new Set(producerIds)).filter((n) => Number.isFinite(n));
        if (unique.length) {
          await tx.userProducerAccess.createMany({
            data: unique.map((producerId) => ({ userId, producerId })),
            skipDuplicates: true,
          });
        }
      }

      // warehouses
      await tx.userWarehouseAccess.deleteMany({ where: { userId } });
      if (!allWarehouses) {
        const unique = Array.from(new Set(warehouseIds)).filter((n) => Number.isFinite(n));
        if (unique.length) {
          await tx.userWarehouseAccess.createMany({
            data: unique.map((warehouseId) => ({ userId, warehouseId })),
            skipDuplicates: true,
          });
        }
      }

      // companies
      await tx.userCompanyAccess.deleteMany({ where: { userId } });
      if (!allCompanies) {
        const unique = Array.from(
          new Set(companies.map((c: any) => String(c).trim())),
        ).filter(Boolean);
        if (unique.length) {
          await tx.userCompanyAccess.createMany({
            data: unique.map((company: string) => ({ userId, company })),
            skipDuplicates: true,
          });
        }
      }
    });

    return this.getScopes(userId);
  }
}