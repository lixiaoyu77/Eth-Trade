import { TradeService } from './trade.service';
export declare class TradeController {
    private readonly tradeService;
    constructor(tradeService: TradeService);
    getEthBalance(data: any): Promise<{
        flag: boolean;
        data: {};
        msg: string;
    }>;
    getPrice(data: any): Promise<{
        flag: boolean;
        data: {};
        msg: string;
    }>;
    getPoolFee(data: any): Promise<{
        flag: boolean;
        data: {};
        msg: string;
    }>;
    getHistoryBalance(data: any): Promise<{
        flag: boolean;
        data: {};
        msg: string;
    }>;
}
