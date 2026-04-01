// src/producers/producers.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';

import { ProducersService } from './producers.service';
import { CreateProducerDto } from './dto/create-producer.dto';
import { UpdateProducerDto } from './dto/update-producer.dto';

import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guards';

@UseGuards(JwtAuthGuard)
@Controller('producers')
export class ProducersController {
  constructor(private readonly producersService: ProducersService) {}

  /**
   * 📌 Listar productores
   * - Aplica scopes (permisos por productor)
   */
  @Get()
  list(@Req() req: any) {
    return this.producersService.findAll(req.scopes);
  }

  /**
   * 📌 Crear productor (solo ADMIN)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateProducerDto) {
    return this.producersService.create(dto);
  }

  /**
   * 📌 Obtener productor por ID (solo ADMIN)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.producersService.findOne(id);
  }

  /**
   * 📌 Actualizar productor (solo ADMIN)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProducerDto,
  ) {
    return this.producersService.update(id, dto);
  }

  /**
   * 📌 Eliminar productor (solo ADMIN)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.producersService.remove(id);
  }
}
