import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { FinancingPlansService } from './financing-plans.service';
import { CreateFinancingPlanDto } from './dto/create-financing-plan.dto';
import { CreateFinancedItemDto } from './dto/create-financed-item.dto';

@Controller('finances/financing-plans')
export class FinancingPlansController {
  constructor(
    private readonly financingPlansService: FinancingPlansService,
  ) {}

  // ✅ Planes de un productor
  @Get('producer/:producerId')
  async getPlansByProducer(
    @Param('producerId', ParseIntPipe) producerId: number,
  ) {
    return this.financingPlansService.getFinancingPlansByProducer(
      producerId,
    );
  }

  // ✅ Un plan por id
  @Get(':id')
  async getPlanById(@Param('id', ParseIntPipe) id: number) {
    return this.financingPlansService.getFinancingPlanById(id);
  }

  // ✅ Crear plan (sin items aún)
  @Post()
  async createPlan(@Body() dto: CreateFinancingPlanDto) {
    return this.financingPlansService.createFinancingPlan(dto);
  }

  // ✅ Agregar item al plan
  @Post(':planId/items')
  async addItemToPlan(
    @Param('planId', ParseIntPipe) planId: number,
    @Body() dto: CreateFinancedItemDto,
  ) {
    return this.financingPlansService.addFinancedItem(planId, dto);
  }
}
