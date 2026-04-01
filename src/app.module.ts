import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { CodesModule } from './codes/codes.module';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ProducersModule } from './producers/producers.module';
import { FinancesModule } from './finances/finances.module';
import { PurchasesModule } from './purchases/purchases.module';
import { InventoryModule } from './inventory/inventory.module';
import { ProductsModule } from './products/products.module';
import { SettingsModule } from './settings/settings.module';
import { ClientsModule } from './clients/clients.module';
import { ScopeInterceptor } from './auth/scope.interceptor';
import { UserScopeService } from './auth/user-scope.service';
import { UsersModule } from './users/users.module';
import { SalesModule } from './sales/sales.module';
import { FxModule } from './fx/fx.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ProducersModule,
    FinancesModule,
    PurchasesModule,
    InventoryModule,
    ProductsModule,
    CodesModule,
    SettingsModule,
    UsersModule,
    SalesModule,
    FxModule,
    ClientsModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    UserScopeService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ScopeInterceptor,
    },
  ],
})
export class AppModule {}
