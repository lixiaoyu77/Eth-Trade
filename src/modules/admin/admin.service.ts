import { Injectable, Logger } from '@nestjs/common';

import { ethers, utils } from 'ethers';
import { BigNumber } from '@ethersproject/bignumber';
import configCommon from '../../config/common';
import { RedisService } from '../../common/redis/redis.service';
import { CryptService } from '../../common/crypt/crypt.service';
const converter = require('hex2dec');
const fs = require('fs');
const path = require('path');

import { abi as erc20_abi } from '../../abi/erc20.json';

@Injectable()
export class AdminService extends RedisService {
  public readonly logger = new Logger(AdminService.name);
  public ethWsProvider;
  public readonly crypt = new CryptService();

  constructor() {
    super();
    this.initialEthWsProvider();
  }

  async initialEthWsProvider() {
    this.logger.log('ws的方式连接eth节点');
    this.logger.log('rpc' + configCommon.rpc.eth);
    const lock = await this.lock('initialEthWsProvider', 10);
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
        await this.delCache('initialEthWsProvider');
        this.initialEthWsProvider();
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
   * 查询代币精度
   */
  async getTokenDecimals(data) {
    const tokenContract = new ethers.Contract(
      data.token,
      erc20_abi,
      this.ethWsProvider,
    );
    const decimals = await tokenContract.decimals();
    return decimals;
  }

  /**
   * 转账转ETH
   */
  async transferETH(data) {
    this.logger.log(`start` + ' 参数：' + JSON.stringify(data));
    let returns = { flag: false, data: {}, msg: '' };
    if (!data.to) {
      returns.flag = true;
      returns.msg = 'A required parameter is missing';
      return returns;
    }

    // const privateKey = this.crypt.decrypt_normal(data.privatekey);
    const privateKey = data.privatekey;
    const wallet = new ethers.Wallet(privateKey, this.ethWsProvider);
    const nonce = await wallet.getTransactionCount();
    let gasPrice = await this.ethWsProvider.getGasPrice();
    gasPrice = gasPrice.mul(115).div(100); //多给15%的gas

    let toEth = ethers.utils.parseEther(data.outamount);
    if (data.isAll) {
      //转出全部ETH
      const ethBal = await this.ethWsProvider.getBalance(wallet.address);
      let costGas = BigNumber.from('21000');
      let gasEth = costGas.mul(gasPrice);
      toEth = ethBal.sub(gasEth); //减去本次交易的手续费，剩下的都是要转的ETH
    }
    const tx: ethers.providers.TransactionRequest = {
      type: 0,
      gasLimit: 21000,
      gasPrice: gasPrice,
      nonce: nonce,
      to: data.to,
      value: toEth,
    };

    try {
      const txResponse = await wallet.sendTransaction(tx);
      returns.data = txResponse;
      this.logger.log('Transaction:' + JSON.stringify(txResponse));
    } catch (err) {
      returns.flag = true;
      returns.msg = '转账报错';
      this.logger.log('Transaction error:' + JSON.stringify(err));
    }
    this.logger.log('end' + ' 结果：' + JSON.stringify(returns));
    return returns;
  }

  /**
   * 转账转Token
   */
  async transferToken(data) {
    this.logger.log(`start` + ' 参数：' + JSON.stringify(data));
    let returns = { flag: false, data: {}, msg: '' };
    if (!data.to) {
      returns.flag = true;
      returns.msg = 'A required parameter is missing';
      return returns;
    }
    const privateKey = this.crypt.decrypt_normal(data.privatekey);
    const wallet = new ethers.Wallet(privateKey, this.ethWsProvider);

    const contractAddress = data.token;
    const toAddress = data.to;
    const tokenContract = new ethers.Contract( //连接Token合约
      contractAddress,
      erc20_abi,
      wallet,
    );

    const outamount = ethers.utils.parseUnits(data.outamount.toString(), 18);

    try {
      const txResponse = await tokenContract.transfer(toAddress, outamount);
      returns.data = txResponse;
      this.logger.log('Transaction: ' + JSON.stringify(txResponse));
    } catch (err) {
      returns.flag = true;
      returns.msg = '转账错误';
      this.logger.log('Transaction error: ' + JSON.stringify(err));
    }
    this.logger.log('end' + '结果: ' + JSON.stringify(returns));
    return returns;
  }
}
