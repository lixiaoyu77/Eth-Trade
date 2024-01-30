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
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const ethers_1 = require("ethers");
const bignumber_1 = require("@ethersproject/bignumber");
const common_2 = require("../../config/common");
const redis_service_1 = require("../../common/redis/redis.service");
const crypt_service_1 = require("../../common/crypt/crypt.service");
const converter = require('hex2dec');
const fs = require('fs');
const path = require('path');
const erc20_json_1 = require("../../abi/erc20.json");
let AdminService = AdminService_1 = class AdminService extends redis_service_1.RedisService {
    constructor() {
        super();
        this.logger = new common_1.Logger(AdminService_1.name);
        this.crypt = new crypt_service_1.CryptService();
        this.initialEthWsProvider();
    }
    async initialEthWsProvider() {
        this.logger.log('ws的方式连接eth节点');
        this.logger.log('rpc' + common_2.default.rpc.eth);
        const lock = await this.lock('initialEthWsProvider', 10);
        if (!lock) {
            return;
        }
        this.ethWsProvider = new ethers_1.ethers.providers.WebSocketProvider(common_2.default.rpc.eth);
        this.ethWsProvider._websocket.on('close', async (code) => {
            this.logger.log(`Connection lost with code ${code}! Attempting reconnect in 3s...`);
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
    async sendMsgToNode() {
        const lock = await this.lock('sendTradeMsgToNode', 40);
        if (!lock) {
            return;
        }
        if (this.checkWsProvider()) {
            this.logger.log('保持ws的连接向node发送一个请求');
            this.ethWsProvider.getBalance('0x0000000000000000000000000000000000000000');
            setTimeout(async () => {
                await this.delCache('sendTradeMsgToNode');
                await this.sendMsgToNode();
            }, 30000);
        }
    }
    async checkWsProvider() {
        let is_ok = false;
        const type = typeof this.ethWsProvider;
        if (type == 'object' && this.ethWsProvider._websocket.readyState === 1) {
            is_ok = true;
            this.logger.log('ethWsProvider 状态正常');
        }
        return is_ok;
    }
    async getTokenDecimals(data) {
        const tokenContract = new ethers_1.ethers.Contract(data.token, erc20_json_1.abi, this.ethWsProvider);
        const decimals = await tokenContract.decimals();
        return decimals;
    }
    async transferETH(data) {
        this.logger.log(`start` + ' 参数：' + JSON.stringify(data));
        let returns = { flag: false, data: {}, msg: '' };
        if (!data.to) {
            returns.flag = true;
            returns.msg = 'A required parameter is missing';
            return returns;
        }
        const privateKey = data.privatekey;
        const wallet = new ethers_1.ethers.Wallet(privateKey, this.ethWsProvider);
        const nonce = await wallet.getTransactionCount();
        let gasPrice = await this.ethWsProvider.getGasPrice();
        gasPrice = gasPrice.mul(115).div(100);
        let toEth = ethers_1.ethers.utils.parseEther(data.outamount);
        if (data.isAll) {
            const ethBal = await this.ethWsProvider.getBalance(wallet.address);
            let costGas = bignumber_1.BigNumber.from('21000');
            let gasEth = costGas.mul(gasPrice);
            toEth = ethBal.sub(gasEth);
        }
        const tx = {
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
        }
        catch (err) {
            returns.flag = true;
            returns.msg = '转账报错';
            this.logger.log('Transaction error:' + JSON.stringify(err));
        }
        this.logger.log('end' + ' 结果：' + JSON.stringify(returns));
        return returns;
    }
    async transferToken(data) {
        this.logger.log(`start` + ' 参数：' + JSON.stringify(data));
        let returns = { flag: false, data: {}, msg: '' };
        if (!data.to) {
            returns.flag = true;
            returns.msg = 'A required parameter is missing';
            return returns;
        }
        const privateKey = this.crypt.decrypt_normal(data.privatekey);
        const wallet = new ethers_1.ethers.Wallet(privateKey, this.ethWsProvider);
        const contractAddress = data.token;
        const toAddress = data.to;
        const tokenContract = new ethers_1.ethers.Contract(contractAddress, erc20_json_1.abi, wallet);
        const outamount = ethers_1.ethers.utils.parseUnits(data.outamount.toString(), 18);
        try {
            const txResponse = await tokenContract.transfer(toAddress, outamount);
            returns.data = txResponse;
            this.logger.log('Transaction: ' + JSON.stringify(txResponse));
        }
        catch (err) {
            returns.flag = true;
            returns.msg = '转账错误';
            this.logger.log('Transaction error: ' + JSON.stringify(err));
        }
        this.logger.log('end' + '结果: ' + JSON.stringify(returns));
        return returns;
    }
};
AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AdminService);
exports.AdminService = AdminService;
//# sourceMappingURL=admin.service.js.map