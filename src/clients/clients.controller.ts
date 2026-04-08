// src/clients/clients.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';

@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // ===== LIST =====
  @Get()
  list(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.clientsService.list({
      search,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 50,
    });
  }

  // ===== GET ONE =====
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.getById(id);
  }

  // ===== STATS =====
  @Get(':id/stats')
  getStats(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.getStats(id);
  }

  // ===== CREATE =====
  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  // ===== UPDATE =====
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateClientDto>,
  ) {
    return this.clientsService.update(id, dto);
  }

  // ===== DELETE =====
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.remove(id);
  }
}