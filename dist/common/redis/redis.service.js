"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const redis_1 = require("../../config/redis");
const common_1 = require("@nestjs/common");
const Redis = require("ioredis");
const redisClient = new Redis(redis_1.default);
let RedisService = RedisService_1 = class RedisService {
    constructor() {
        this.logger = new common_1.Logger(RedisService_1.name);
        this.getClient();
    }
    async getClient() {
        redisClient.on('error', (err) => {
            this.logger.error('redis client 监听error:' + err.message);
        });
    }
    async setCache(key, value, expire = 3600) {
        try {
            let ret = await redisClient.set(key, JSON.stringify(value), 'EX', expire);
            return ret;
        }
        catch (err) {
            this.logger.debug('redis调用set出错,error:' + err.message);
        }
    }
    async getCache(key) {
        try {
            let ret = await redisClient.get(key, (err, result) => {
            });
            if (typeof ret === 'string') {
                ret = JSON.parse(ret);
            }
            return ret;
        }
        catch (err) {
            this.logger.debug('redis调用get出错,error:' + err.message);
        }
    }
    async delCache(key) {
        try {
            let ret = await redisClient.del(key);
            return ret;
        }
        catch (err) {
            this.logger.debug('redis调用del出错,error:' + err.message);
        }
    }
    async rPush(key, value) {
        try {
            let ret = await redisClient.rpush(key, value);
            return ret;
        }
        catch (err) {
            this.logger.debug('redis调用rpush出错,error:' + err.message);
        }
    }
    async lock(key, expire = 5) {
        try {
            let is_lock = await redisClient.setnx(key, '1');
            if (is_lock) {
                await redisClient.expire(key, expire);
            }
            return is_lock ? true : false;
        }
        catch (err) {
            this.logger.debug('redis调用setnx出错,error:' + err.message);
        }
    }
};
RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RedisService);
exports.RedisService = RedisService;
//# sourceMappingURL=redis.service.js.map