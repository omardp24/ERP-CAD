import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FinancesService } from './finances.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { LiquidateDto } from './dto/liquidate.dto';
import { CreateProducerPaymentScheduleDto } from './dto/create-producer-payment-schedule.dto';
import { ExecuteProducerPaymentScheduleDto } from './dto/execute-producer-payment-schedule.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateFinancedItemDto } from './dto/create-financed-item.dto';
import { CreateCycleExtraCostDto } from './dto/create-cycle-extra-cost.dto';
import { CreateFinancingCycleDto } from './dto/create-financing-cycle.dto';

@UseGuards(JwtAuthGuard)
@Controller('finances')
export class FinancesController {
  constructor(private readonly financesService: FinancesService) {}

  // 1) Crear movimiento manual
  @Post('movements')
  async createMovement(@Req() req: any, @Body() dto: CreateMovementDto) {
    return this.financesService.createMovement(dto, req.scopes, req.user?.role);
  }

  // 2) Liquidar (crear PAYMENT por liquidación)
  @Post('movements/liquidate')
  async liquidate(@Req() req: any, @Body() dto: LiquidateDto) {
    return this.financesService.liquidate(dto, req.scopes, req.user?.role);
  }

  // 3) Listar todos los movimientos
  @Get('movements')
  async findAllMovements(@Req() req: any) {
    return this.financesService.findAllMovements(req.scopes, req.user?.role);
  }

  // 4) Buscar un movimiento por id
  @Get('movements/:id')
  async findOneMovement(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.financesService.findOneMovement(id, req.scopes, req.user?.role);
  }

  // 5) Actualizar movimiento
  @Post('movements/:id')
  async updateMovement(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMovementDto,
  ) {
    return this.financesService.updateMovement(id, dto, req.scopes, req.user?.role);
  }

  // 6) Eliminar movimiento (⚠️ yo lo dejaría ADMIN)
  @Post('movements/:id/delete')
  async removeMovement(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.financesService.removeMovement(id, req.scopes, req.user?.role);
  }

  // 7) Movimientos por productor
  @Get('movements/producer/:producerId')
  async findMovementsByProducer(
    @Req() req: any,
    @Param('producerId', ParseIntPipe) producerId: number,
    @Query('cycle') cycle?: string,
    @Query('company') company?: string,
  ) {
    return this.financesService.findMovementsByProducer(
      producerId,
      cycle,
      company,
      req.scopes,
      req.user?.role,
    );
  }

  // 8) Resumen general
  @Get('summary')
  async getSummary(
    @Req() req: any,
    @Query('cycle') cycle?: string,
    @Query('company') company?: string,
  ) {
    return this.financesService.getSummary(cycle, company, req.scopes, req.user?.role);
  }

  // 9) Estado de cuenta por productor
  @Get('statement/producer/:producerId')
  async getProducerStatement(
    @Req() req: any,
    @Param('producerId', ParseIntPipe) producerId: number,
    @Query('cycle') cycle?: string,
    @Query('company') company?: string,
  ) {
    return this.financesService.getProducerStatement(
      producerId,
      cycle,
      company,
      req.scopes,
      req.user?.role,
    );
  }

  // 10) Overview por ciclo/company
  @Get('overview')
  async getOverview(
    @Req() req: any,
    @Query('cycle') cycle?: string,
    @Query('company') company?: string,
  ) {
    return this.financesService.getOverview(cycle, company, req.scopes, req.user?.role);
  }

  // 11) Interés simple productor (⚠️ tu service actual NO tiene scopes aquí;
  // si quieres que también respete permisos, me pasas getProducerInterest y lo adapto)
  @Get('statement/producer/:producerId/interest')
  async getProducerInterest(
    @Param('producerId', ParseIntPipe) producerId: number,
    @Query('annualRate') annualRate: string,
    @Query('cycle') cycle?: string,
    @Query('untilDate') untilDate?: string,
    @Query('company') company?: string,
  ) {
    return this.financesService.getProducerInterest(
      producerId,
      Number(annualRate),
      cycle,
      untilDate,
      company,
    );
  }

  // 12) Estado de cuenta por plan de siembra (si cropPlan pertenece a un productor,
  // lo ideal es scopear también; si lo quieres, te adapto ese service)
  @Get('statement/crop-plan/:cropPlanId')
  async getCropPlanStatement(
    @Param('cropPlanId', ParseIntPipe) cropPlanId: number,
  ) {
    return this.financesService.getCropPlanStatement(cropPlanId);
  }

  // 13) Comisiones sobre anticipos
  @Get('statement/producer/:producerId/advance-commissions')
  async getProducerAdvanceCommissions(
    @Req() req: any,
    @Param('producerId', ParseIntPipe) producerId: number,
    @Query('untilDate') untilDate?: string,
    @Query('cycle') cycle?: string,
    @Query('company') company?: string,
  ) {
    return this.financesService.getProducerAdvanceCommissions(
      producerId,
      untilDate,
      cycle,
      company,
      req.scopes,
      req.user?.role,
    );
  }

  // 14) OVERVIEW GLOBAL (puede quedar admin-only si quieres)
  @Get('overview/global')
  async getGlobalOverview() {
    return this.financesService.getGlobalOverview();
  }

  // 15) Calendario / proyección de pagos y anticipos
  @Get('payment-schedule')
  async getPaymentSchedule(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('company') company?: string,
  ) {
    return this.financesService.getPaymentSchedule(from, to, company, req.scopes, req.user?.role);
  }

  // 16) Resumen de riesgo (top deudores / saldos a favor)
  @Get('risk/summary')
  async getRiskSummary(
    @Req() req: any,
    @Query('cycle') cycle?: string,
    @Query('company') company?: string,
    @Query('top') top?: string,
  ) {
    const topN = top ? Number(top) : 10;
    return this.financesService.getRiskSummary(cycle, company, topN, req.scopes, req.user?.role);
  }

  // ============================
  //  PAYMENT SCHEDULE (producer)
  // ============================

  @Post('payment-schedule/producer')
  createPaymentSchedule(@Req() req: any, @Body() dto: CreateProducerPaymentScheduleDto) {
    return this.financesService.createProducerPaymentSchedule(dto, req.scopes, req.user?.role);
  }

  @Get('payment-schedule/producer')
  listSchedules(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('producerId') producerId?: any,
  ) {
    const pid = producerId !== undefined && producerId !== null ? Number(producerId) : undefined;
    return this.financesService.listProducerPaymentSchedules(status, pid, req.scopes, req.user?.role);
  }

  @Post('payment-schedule/producer/:id/execute')
  executeSchedule(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExecuteProducerPaymentScheduleDto,
  ) {
    return this.financesService.executeProducerPaymentSchedule(id, dto, req.scopes, req.user?.role);
  }

  // ============================
  //  FINANCED ITEMS
  // ============================

  @Post('financed-items')
  createFinancedItem(@Body() dto: CreateFinancedItemDto) {
    return this.financesService.createFinancedItem(dto);
  }

  @Get('cycles/:cycleId/financed-items')
  getCycleFinancedItems(@Param('cycleId', ParseIntPipe) cycleId: number) {
    return this.financesService.getCycleFinancedItems(cycleId);
  }

  // ============================
  //  CYCLE EXTRA COSTS
  // ============================

  @Post('cycle-extra-costs')
  createCycleExtraCost(@Body() dto: CreateCycleExtraCostDto) {
    return this.financesService.createCycleExtraCost(dto);
  }

  @Get('cycles/:cycleId/extra-costs')
  getCycleExtraCosts(@Param('cycleId', ParseIntPipe) cycleId: number) {
    return this.financesService.getCycleExtraCosts(cycleId);
  }

  // =============================
  //  RESUMEN DEL CICLO
  // =============================

  @Get('cycles/:cycleId/summary')
  getCycleSummary(@Param('cycleId', ParseIntPipe) cycleId: number) {
    return this.financesService.getCycleSummary(cycleId);
  }

  // Lista de ciclos (para combos)
  @Get('cycles')
  getCyclesList() {
    return this.financesService.getCyclesList();
  }

  // Crear ciclo nuevo
  @Post('cycles')
  createCycle(@Body() dto: CreateFinancingCycleDto) {
    return this.financesService.createCycle(dto);
  }
}
