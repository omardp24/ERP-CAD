import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CodesService } from 'src/codes/codes.service';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codesService: CodesService,
  ) {}

  async findAll() {
    // ✅ Por defecto muestro TODOS (activos e inactivos).
    // Si quieres que por defecto no se vean inactivos: where: { active: true }
    return this.prisma.products.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const p = await this.prisma.products.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('PRODUCT_NOT_FOUND');
    return p;
  }

  async create(dto: CreateProductDto) {
    const name = (dto.name || '').trim();
    if (!name) throw new BadRequestException('NAME_REQUIRED');

    // ✅ obligatorio
    const pricingTag = String(dto.pricingTag || '').trim().toUpperCase();
    if (!pricingTag) throw new BadRequestException('PRICING_TAG_REQUIRED');

    // ✅ opcional: basePriceUsd
    const basePriceUsd =
      dto.basePriceUsd === undefined || dto.basePriceUsd === null
        ? null
        : Number(dto.basePriceUsd);

    if (basePriceUsd !== null && (!Number.isFinite(basePriceUsd) || basePriceUsd < 0)) {
      throw new BadRequestException('BASE_PRICE_USD_INVALID');
    }

    // ✅ duplicado (nombre + category)
    const existing = await this.prisma.products.findFirst({
      where: {
        name,
        category: dto.category ?? null,
      },
    });
    if (existing) throw new ConflictException('PRODUCT_ALREADY_EXISTS');

    const code = await this.codesService.generateCode('PRODUCT');

    try {
      return await this.prisma.products.create({
        data: {
          code,
          name,
          category: dto.category ?? null,
          unit: dto.unit ?? null,
          pricingTag: pricingTag as any,
          basePriceUsd: basePriceUsd as any,
          active: true,
        },
      });
    } catch (err) {
      console.error('Error creando producto:', err);
      throw new InternalServerErrorException('ERROR_CREATING_PRODUCT');
    }
  }

  async update(id: number, dto: UpdateProductDto) {
    const current = await this.prisma.products.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('PRODUCT_NOT_FOUND');

    const data: any = {};

    if (dto.name !== undefined) {
      const name = (dto.name || '').trim();
      if (!name) throw new BadRequestException('NAME_REQUIRED');
      data.name = name;
    }

    if (dto.category !== undefined) {
      data.category = dto.category ? String(dto.category).trim() : null;
    }

    if (dto.unit !== undefined) {
      data.unit = dto.unit ? String(dto.unit).trim() : null;
    }

    if (dto.pricingTag !== undefined) {
      data.pricingTag = String(dto.pricingTag).trim().toUpperCase();
    }

    if (dto.basePriceUsd !== undefined) {
      const v = dto.basePriceUsd;
      if (v === null) {
        data.basePriceUsd = null;
      } else {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) throw new BadRequestException('BASE_PRICE_USD_INVALID');
        data.basePriceUsd = n as any;
      }
    }

    // ✅ si cambian name/category, revalidar duplicado
    const nextName = data.name ?? current.name ?? '';
    const nextCategory = data.category ?? current.category ?? null;

    const dup = await this.prisma.products.findFirst({
      where: {
        id: { not: id },
        name: nextName,
        category: nextCategory,
      },
    });
    if (dup) throw new ConflictException('PRODUCT_ALREADY_EXISTS');

    try {
      return await this.prisma.products.update({
        where: { id },
        data,
      });
    } catch (err) {
      console.error('Error actualizando producto:', err);
      throw new InternalServerErrorException('ERROR_UPDATING_PRODUCT');
    }
  }

  async updateStatus(id: number, active: boolean) {
    const current = await this.prisma.products.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('PRODUCT_NOT_FOUND');

    try {
      return await this.prisma.products.update({
        where: { id },
        data: { active: Boolean(active) },
      });
    } catch (err) {
      console.error('Error cambiando status producto:', err);
      throw new InternalServerErrorException('ERROR_UPDATING_PRODUCT_STATUS');
    }
  }

  // ✅ “soft delete” (con tu modelo actual) = active=false
  async softDelete(id: number) {
    const current = await this.prisma.products.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('PRODUCT_NOT_FOUND');

    try {
      return await this.prisma.products.update({
        where: { id },
        data: { active: false },
      });
    } catch (err) {
      console.error('Error soft-delete producto:', err);
      throw new InternalServerErrorException('ERROR_DELETING_PRODUCT');
    }
  }
}
