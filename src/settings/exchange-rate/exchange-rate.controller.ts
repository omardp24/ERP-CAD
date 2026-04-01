// src/settings/exchange-rate/exchange-rate.controller.ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ExchangeRateService } from './exchange-rate.service';

@UseGuards(JwtAuthGuard)
@Controller('settings/exchange-rate')
export class ExchangeRateController {
  constructor(private readonly svc: ExchangeRateService) {}

  @Get('today')
  async today() {
    return this.svc.getToday();
  }

  @Post()
  async upsert(@Body() body: { date: string; rate: number }) {
    return this.svc.upsert(body);
  }
}
