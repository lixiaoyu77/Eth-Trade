import { Module } from '@nestjs/common';
import { TradeModule } from './modules/trade/trade.module';
import { AdminModule } from './modules/admin/admin.module';


@Module({
  imports: [
	TradeModule,
	AdminModule
	],
  controllers: [],
  providers: [],
})
export class AppModule {}
