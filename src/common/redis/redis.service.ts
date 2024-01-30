import redisConfig from "../../config/redis";
//import { createClient } from 'redis';
import { Module } from '@nestjs/common';
import { Injectable, Logger } from "@nestjs/common";
import { report } from "process";
const Redis = require("ioredis");
const redisClient = new Redis(redisConfig);
import{Redis} from "ioredis"

@Injectable()
export class RedisService {
    public readonly logger = new Logger(RedisService.name);
    public redisClient ;

    constructor()
    {
        this.getClient();
    }

     /**
     * 获取redis客户端
     */
      async getClient()
      {
          redisClient.on('error', (err) => {
                this.logger.error('redis client 监听error:'+err.message)
          });

        }
          
      /**
       * 设置key->value
       */
     async setCache(key:string,value:any,expire:number=3600)
      {
          try{
              let ret = await redisClient.set(key,JSON.stringify(value),'EX',expire);
              return ret;
          }catch(err)
          {
              this.logger.debug('redis调用set出错,error:'+err.message);
          }
      }
  
      /**
       * 获取value
       */
      async getCache(key:string)
      {
          try{
              let ret = await redisClient.get(key,(err,result)=>{
                //this.logger.log('redis get key:'+result);
              });
              if (typeof ret === 'string')
              {
                  ret = JSON.parse(ret);
              }
              return ret;
            }catch(err)
            {
              this.logger.debug('redis调用get出错,error:'+err.message);
            }
      }

      /**
       * 删除redis
       * @param key 
       * @returns 
       */
      async delCache(key:string)
      {
        try{
            let ret = await redisClient.del(key)
            return ret;
        }catch(err)
        {
            this.logger.debug('redis调用del出错,error:'+err.message);
        }
      }

  
      /**
       * 压入队列
       */
      async rPush(key:string,value:string)
      {
       // this.logger.debug('redis push test');

          try{
              let ret = await redisClient.rpush(key,value);
              return ret;
          }catch(err)
          {
              this.logger.debug('redis调用rpush出错,error:'+err.message);
          }
      }

    /**
     * 锁
     */
    async lock(key:string,expire:number=5)
    {
        try{
            let is_lock = await redisClient.setnx(key,'1');
            if(is_lock)
            {
                await redisClient.expire(key,expire);
            }
            return is_lock? true : false;
        }catch(err){
            this.logger.debug('redis调用setnx出错,error:'+err.message);
        }
    }
}