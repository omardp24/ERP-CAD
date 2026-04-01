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

import { PricingService } from './pricing/pricing.service';
import { CreatePriceListDto } from './pricing/dto/create-price-list.dto';
import { UpsertPriceListItemDto } from './pricing/dto/upsert-price-list-item.dto';

@UseGuards(JwtAuthGuard)
@Controller('settings/price-lists')
export class SettingsController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  list(@Query('company') company?: string) {
    return this.pricing.listPriceLists(company);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.pricing.getPriceList(id);
  }

  @Post()
  create(@Body() dto: CreatePriceListDto) {
    return this.pricing.createPriceList(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreatePriceListDto>,
  ) {
    return this.pricing.updatePriceList(id, dto);
  }

  @Post(':id/items')
  upsertItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertPriceListItemDto,
  ) {
    return this.pricing.upsertPriceListItem(id, dto);
  }

  @Delete(':id/items/:inventoryItemId')
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('inventoryItemId', ParseIntPipe) inventoryItemId: number,
  ) {
    return this.pricing.removePriceListItem(id, inventoryItemId);
  }
}
