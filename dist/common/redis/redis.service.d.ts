import { Logger } from "@nestjs/common";
export declare class RedisService {
    readonly logger: Logger;
    redisClient: any;
    constructor();
    getClient(): Promise<void>;
    setCache(key: string, value: any, expire?: number): Promise<any>;
    getCache(key: string): Promise<any>;
    delCache(key: string): Promise<any>;
    rPush(key: string, value: string): Promise<any>;
    lock(key: string, expire?: number): Promise<boolean>;
}
