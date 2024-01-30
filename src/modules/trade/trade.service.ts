import { Injectable, Logger } from '@nestjs/common';

import { ethers, utils } from 'ethers';
import { BigNumber } from '@ethersproject/bignumber';
import configCommon from '../../config/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  pbkdf2Sync,
} from 'crypto';
import { RedisService } from '../../common/redis/redis.service';
import { CryptService } from '../../common/crypt/crypt.service';
import { abi as erc20abi } from '../../abi/erc20.json';
import { abi as erc721abi } from '../../abi/erc721.json';
import routes from 'src/config/route';
const converter = require('hex2dec');
const fs = require('fs');
const path = require('path');

import { abi as uni_v3_quito_abi } from '../../abi/uniswapv3_quote.json';
import { abi as uni_v2_route_abi } from '../../abi/uniswapv2_route.json';
import { abi as sushi_route_abi } from '../../abi/sushi_route.json';
import { abi as pancake_route_abi } from '../../abi/pancake_route.json';
import { abi as uni_v3_pool_abi } from '../../abi/uniswapv3_pair.json';

@Injectable()
export class TradeService extends RedisService {
  public readonly logger = new Logger(TradeService.name);
  public ethWsProvider;
  public readonly crypt = new CryptService();

  constructor() {
    super();
    this.connectEthWsProvider();
  }

  async connectEthWsProvider() {
    this.logger.log('ws的方式连接eth节点');
    this.logger.log('rpc' + configCommon.rpc.eth);
    const lock = await this.lock('connectEthWsProvider', 10);
    if (!lock) {
      return;
    }
    this.ethWsProvider = new ethers.providers.WebSocketProvider(
      configCommon.rpc.eth,
    );
    this.ethWsProvider._websocket.on('close', async (code: any) => {
      this.logger.log(
        `Connection lost with code ${code}! Attempting reconnect in 3s...`,
      );
      this.ethWsProvider._websocket.terminate();
      this.ethWsProvider.destroy();
      setTimeout(async () => {
        await this.delCache('connectEthWsProvider');
        this.connectEthWsProvider();
      }, 3000);
    });

    setTimeout(async () => {
      this.sendMsgToNode();
    }, 30000);
  }

  /**
   * 每30秒跟节点交互一次防止断开
   */
  async sendMsgToNode() {
    const lock = await this.lock('sendTradeMsgToNode', 40);
    if (!lock) {
      return;
    }
    if (this.checkWsProvider()) {
      //判断ws provider 连接状态
      this.logger.log('保持ws的连接向node发送一个请求');
      this.ethWsProvider.getBalance(
        '0x0000000000000000000000000000000000000000',
      );
      setTimeout(async () => {
        await this.delCache('sendTradeMsgToNode');
        await this.sendMsgToNode();
      }, 30000);
    }
  }

  /**
   * 检查ws provider 的状态
   */
  async checkWsProvider() {
    let is_ok = false;
    const type = typeof this.ethWsProvider;
    if (type == 'object' && this.ethWsProvider._websocket.readyState === 1) {
      is_ok = true;
      this.logger.log('ethWsProvider 状态正常');
    }
    return is_ok;
  }

  /**
   * 查询账号余额
   */
  async getEthBalance(data) {
    this.logger.log(`start` + ' 参数：' + JSON.stringify(data));
    let returns = { flag: false, data: {}, msg: '' };
    if (!data.from) {
      returns.flag = true;
      returns.msg = 'A required parameter is missing';
      return returns;
    }

    if (!this.checkWsProvider()) {
      //判断ws provider 连接状态
      returns.flag = true;
      returns.msg = 'ws provider closed';
      return returns;
    }

    let number: any = data.number;
    if (data.number != 'latest') {
      number = parseInt(data.number);
    }

    try {
      const balance = await this.ethWsProvider.getBalance(data.from, number);
      returns.data = { balance: balance.toString() };
    } catch (err) {
      returns.flag = true;
      returns.msg = '获取balance报错';
      this.logger.log('balance error:' + JSON.stringify(err));
    }
    this.logger.log('end ' + ' 结果：' + JSON.stringify(returns));
    return returns;
  }

  /**
   * 获取价格
   */
  async getPrice(data) {
    this.logger.log(`start` + ' getPrice-参数：' + JSON.stringify(data));
    let returns = { flag: false, data: {}, msg: '' };

    if (!this.checkWsProvider()) {
      //判断ws provider 连接状态
      returns.flag = true;
      returns.msg = 'ws provider closed';
      return returns;
    }

    if (
      !data.decimalIn ||
      !data.amountIn ||
      !data.decimalOut ||
      !data.netWorker ||
      !data.platform
    ) {
      returns.flag = true;
      returns.msg = 'A required parameter is missing';
      return returns;
    }

    const amountIn = ethers.utils.parseUnits(
      data.amountIn.toString(),
      parseInt(data.decimalIn),
    );
    let is_ok = true;

    let amountOut: any, pendingAmountOut: any;
    if (data.platform == 'uniswapV3') {
      const quoteAbi = uni_v3_quito_abi; //加载abi文件
      //实例路由合约
      const quoter = new ethers.Contract(
        routes[data.netWorker][data.platform].quote_addr,
        quoteAbi,
        this.ethWsProvider,
      );
      //组装path
      const packKey = data.packKey.split(',');
      const packValue = data.packValue.split(',');
      this.logger.log('getPrice-v2-packkey:' + JSON.stringify(packKey));
      this.logger.log('getPrice-v2-packvalue:' + JSON.stringify(packValue));
      const path = utils.solidityPack(packKey, packValue);
      this.logger.log('getPrice-v2-path:' + JSON.stringify(packValue));
      //获取交换的token数量
      try {
        amountOut = await quoter.callStatic.quoteExactInput(path, amountIn);

        if (data.isPending) {
          const outcall = quoter.interface.encodeFunctionData(
            'quoteExactInput',
            [path, amountIn],
          );
          const res_out = await this.ethWsProvider.call(
            {
              data: outcall,
              to: routes[data.netWorker][data.platform].quote_addr,
              value: ethers.utils.parseEther('0'),
            },
            'pending',
          );
          this.logger.log(`getPrice-v2 pending res_out: ${res_out}`);
          pendingAmountOut = converter.hexToDec(
            res_out.substring(res_out.length - 64),
          );
          this.logger.log(
            `getPrice-v2 pending pendingAmountOut: ${pendingAmountOut}`,
          );
        }
        //pendingAmountOut =  await quoter.callStatic.quoteExactInput(path, amountIn);
      } catch (error) {
        is_ok = false;
        returns.flag = true;
        returns.msg = '获取token数量异常';
        this.logger.log('getPrice-error:' + JSON.stringify(error));
      }
    } else {
      let routeAbi: any;
      if (data.platform == 'uniswapV2') {
        routeAbi = uni_v2_route_abi;
      } else if (data.platform == 'sushi') {
        routeAbi = sushi_route_abi;
      } else if (data.platform == 'pancakeV2') {
        routeAbi = pancake_route_abi;
      } else {
        returns.flag = true;
        returns.msg = 'platform is wrong';
        return returns;
      }
      //实例路由合约
      const router = new ethers.Contract(
        routes[data.netWorker][data.platform].route_addr,
        routeAbi,
        this.ethWsProvider,
      );
      const path = data.packValueV2.split(',');
      this.logger.log('getPrice-path-v2:' + JSON.stringify(path));
      try {
        const len = path.length - 1;
        const amountOutTmp = await router.getAmountsOut(amountIn, path);
        amountOut = amountOutTmp[len];
        this.logger.log(`getPrice amountOut: ${amountOut}`);

        if (data.isPending) {
          const outcall = router.interface.encodeFunctionData('getAmountsOut', [
            amountIn,
            path,
          ]);
          const res_out = await this.ethWsProvider.call(
            {
              data: outcall,
              to: routes[data.netWorker][data.platform].route_addr,
              value: ethers.utils.parseEther('0'),
            },
            'pending',
          );
          this.logger.log(`getPrice pending res_out: ${res_out}`);
          pendingAmountOut = converter.hexToDec(
            res_out.substring(res_out.length - 64),
          );
          this.logger.log(
            `getPrice pending pendingAmountOut: ${pendingAmountOut}`,
          );
        }
      } catch (error) {
        is_ok = false;
        returns.flag = true;
        returns.msg = '获取token数量异常';
        this.logger.log('getPrice-error:' + JSON.stringify(error));
      }
    }
    this.logger.log(`getPrice amountOut0: ${amountOut} `);

    if (is_ok) {
      //除以精度
      const amountOutInt =
        parseInt(amountOut.toString()) / 10 ** data.decimalOut;
      this.logger.log(`getPrice amountOutInt: ${amountOutInt} `);
      //计算价格
      const price = data.amountIn / amountOutInt;

      if (data.isPending) {
        //pending价格计算
        const pendingAmountOutInt =
          parseInt(pendingAmountOut.toString()) / 10 ** data.decimalOut;
        this.logger.log(
          `getPrice pendingAmountOutInt: ${pendingAmountOutInt} `,
        );
        //计算价格
        const pending_price = data.amountIn / pendingAmountOutInt;
        returns.data = { price: price, pending_price: pending_price };
      } else {
        returns.data = { price: price };
      }
    }
    this.logger.log('getPrice-end');
    return returns;
  }

  /**
   * 获取pool fee
   */
  async getPoolFee(data) {
    this.logger.log('getPoolFee start 参数：' + JSON.stringify(data));
    let returns = { flag: false, data: {}, msg: '' };

    if (!this.checkWsProvider()) {
      //判断ws provider 连接状态
      returns.flag = true;
      returns.msg = 'ws provider closed';
      return returns;
    }

    if (!data.pool_id) {
      returns.flag = true;
      returns.msg = 'A required parameter is missing';
      return returns;
    }

    const pool_c = new ethers.Contract(
      data.pool_id,
      uni_v3_pool_abi,
      this.ethWsProvider,
    );
    try {
      const fee = await pool_c.fee();
      returns.data = { fee: fee };
    } catch (error) {
      returns.flag = true;
      returns.msg = '获取pool fee异常';
      this.logger.log('getPoolFee-error:' + JSON.stringify(error));
    }

    return returns;
  }

  /**
   * 查询账号余额
   */
  async getHistoryBalance(data) {
    this.logger.log(`start` + ' 参数：' + JSON.stringify(data));
    let returns = { flag: false, data: {}, msg: '' };
    if (!data.from) {
      returns.flag = true;
      returns.msg = 'A required parameter is missing';
      return returns;
    }

    if (!this.checkWsProvider()) {
      //判断ws provider 连接状态
      returns.flag = true;
      returns.msg = 'ws provider closed';
      return returns;
    }

    let number: any = data.number;
    if (data.number != 'latest') {
      number = parseInt(data.number);
    }

    try {
      let balance: any = 0;
      if (data.tokenType == 'ETH') {
        balance = await this.ethWsProvider.getBalance(data.from, number);
      } else {
        const inter = new ethers.utils.Interface(erc20abi);
        let data_out = inter.encodeFunctionData('balanceOf', [data.from]);
        const res = await this.ethWsProvider.call(
          {
            to: data.token,
            data: data_out,
          },
          number,
        );
        balance = converter.hexToDec(res);
        this.logger.log('call data out:' + converter.hexToDec(res));
      }
      returns.data = { balance: balance.toString() };
    } catch (err) {
      returns.flag = true;
      returns.msg = '获取balance报错';
      this.logger.log('balance error:' + JSON.stringify(err));
    }
    this.logger.log('end ' + ' 结果：' + JSON.stringify(returns));
    return returns;
  }
}
