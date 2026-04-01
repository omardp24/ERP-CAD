import { Controller, Get, Query } from '@nestjs/common';
import { FxService } from './fx.service';

@Controller('fx')
export class FxController {
  constructor(private readonly fxService: FxService) {}

  // GET /fx/bcv?base=USD&quote=VES
  @Get('bcv')
  async getBcvRate(
    @Query('base') base?: string,
    @Query('quote') quote?: string,
  ) {
    return this.fxService.getBcvRate({
      base: (base || 'USD').toUpperCase(),
      quote: (quote || 'VES').toUpperCase(),
    });
  }
}
