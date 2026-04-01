import { Module } from '@nestjs/common';
import { PricingModule } from './pricing/pricing.module';
import { SettingsController } from './settings.controller';

@Module({
  imports: [PricingModule],
  controllers: [SettingsController],
})
export class SettingsModule {}
