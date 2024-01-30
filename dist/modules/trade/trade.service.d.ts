import { Logger } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { CryptService } from '../../common/crypt/crypt.service';
export declare class TradeService extends RedisService {
    readonly logger: Logger;
    ethWsProvider: any;
    readonly crypt: CryptService;
    constructor();
    connectEthWsProvider(): Promise<void>;
    sendMsgToNode(): Promise<void>;
    checkWsProvider(): Promise<boolean>;
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
