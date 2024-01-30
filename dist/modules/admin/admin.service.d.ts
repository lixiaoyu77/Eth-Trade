import { Logger } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { CryptService } from '../../common/crypt/crypt.service';
export declare class AdminService extends RedisService {
    readonly logger: Logger;
    ethWsProvider: any;
    readonly crypt: CryptService;
    constructor();
    initialEthWsProvider(): Promise<void>;
    sendMsgToNode(): Promise<void>;
    checkWsProvider(): Promise<boolean>;
    getTokenDecimals(data: any): Promise<any>;
    transferETH(data: any): Promise<{
        flag: boolean;
        data: {};
        msg: string;
    }>;
    transferToken(data: any): Promise<{
        flag: boolean;
        data: {};
        msg: string;
    }>;
}
