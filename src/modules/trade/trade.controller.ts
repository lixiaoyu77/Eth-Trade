import {Controller,Post,Body} from '@nestjs/common';
import { TradeService } from './trade.service';
  
  @Controller('/trade')
  export class TradeController {
    constructor(private readonly tradeService: TradeService) {}
    /**
     * 获取balance
     * @param data 
     * @returns 
     */
    @Post('getEthBalance')
    async getEthBalance(@Body() data){
        return await this.tradeService.getEthBalance(data);
    }

    /**
     * 获取token价格
     * @param data 
     * @returns 
     */
    @Post('getPrice')
    async getPrice(@Body() data){
        return await this.tradeService.getPrice(data);
    }

    /**
     * 获取pool fee
     * @param data 
     * @returns 
     */
    @Post('getPoolFee')
    async getPoolFee(@Body() data){
        return await this.tradeService.getPoolFee(data);
    }

    /**
     * 获取pool fee
     * @param data 
     * @returns 
     */
    @Post('getHistoryBalance')
    async getHistoryBalance(@Body() data){
        return await this.tradeService.getHistoryBalance(data);
    }




  }
  