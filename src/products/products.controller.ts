import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guards';
import { Roles } from 'src/auth/roles.decorator';

import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ✅ listar (yo lo dejo visible a ADMIN/OPERACIONES/INVENTARIOS)
  @Get()
  @Roles('ADMIN', 'OPERACIONES', 'INVENTARIOS')
  async findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'OPERACIONES', 'INVENTARIOS')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  // ✅ crear (ADMIN)
  @Post()
  @Roles('ADMIN')
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  // ✅ editar (ADMIN) — si quieres permitir OPERACIONES/INVENTARIOS, agrega aquí
  @Patch(':id')
  @Roles('ADMIN')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  // ✅ activar / inactivar (OPERACIONES o INVENTARIOS también pueden)
  @Patch(':id/status')
  @Roles('ADMIN', 'OPERACIONES', 'INVENTARIOS')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.productsService.updateStatus(id, dto.active);
  }

  // ✅ “soft delete” = active=false (SOLO ADMIN)
  @Delete(':id')
  @Roles('ADMIN')
  async softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.softDelete(id);
  }
}
