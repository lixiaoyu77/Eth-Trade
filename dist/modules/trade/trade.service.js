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
var TradeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeService = void 0;
const common_1 = require("@nestjs/common");
const ethers_1 = require("ethers");
const common_2 = require("../../config/common");
const redis_service_1 = require("../../common/redis/redis.service");
const crypt_service_1 = require("../../common/crypt/crypt.service");
const erc20_json_1 = require("../../abi/erc20.json");
const route_1 = require("../../config/route");
const converter = require('hex2dec');
const fs = require('fs');
const path = require('path');
const uniswapv3_quote_json_1 = require("../../abi/uniswapv3_quote.json");
const uniswapv2_route_json_1 = require("../../abi/uniswapv2_route.json");
const sushi_route_json_1 = require("../../abi/sushi_route.json");
const pancake_route_json_1 = require("../../abi/pancake_route.json");
const uniswapv3_pair_json_1 = require("../../abi/uniswapv3_pair.json");
let TradeService = TradeService_1 = class TradeService extends redis_service_1.RedisService {
    constructor() {
        super();
        this.logger = new common_1.Logger(TradeService_1.name);
        this.crypt = new crypt_service_1.CryptService();
        this.connectEthWsProvider();
    }
    async connectEthWsProvider() {
        this.logger.log('ws的方式连接eth节点');
        this.logger.log('rpc' + common_2.default.rpc.eth);
        const lock = await this.lock('connectEthWsProvider', 10);
        if (!lock) {
            return;
        }
        this.ethWsProvider = new ethers_1.ethers.providers.WebSocketProvider(common_2.default.rpc.eth);
        this.ethWsProvider._websocket.on('close', async (code) => {
            this.logger.log(`Connection lost with code ${code}! Attempting reconnect in 3s...`);
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
    async getEthBalance(data) {
        this.logger.log(`start` + ' 参数：' + JSON.stringify(data));
        let returns = { flag: false, data: {}, msg: '' };
        if (!data.from) {
            returns.flag = true;
            returns.msg = 'A required parameter is missing';
            return returns;
        }
        if (!this.checkWsProvider()) {
            returns.flag = true;
            returns.msg = 'ws provider closed';
            return returns;
        }
        let number = data.number;
        if (data.number != 'latest') {
            number = parseInt(data.number);
        }
        try {
            const balance = await this.ethWsProvider.getBalance(data.from, number);
            returns.data = { balance: balance.toString() };
        }
        catch (err) {
            returns.flag = true;
            returns.msg = '获取balance报错';
            this.logger.log('balance error:' + JSON.stringify(err));
        }
        this.logger.log('end ' + ' 结果：' + JSON.stringify(returns));
        return returns;
    }
    async getPrice(data) {
        this.logger.log(`start` + ' getPrice-参数：' + JSON.stringify(data));
        let returns = { flag: false, data: {}, msg: '' };
        if (!this.checkWsProvider()) {
            returns.flag = true;
            returns.msg = 'ws provider closed';
            return returns;
        }
        if (!data.decimalIn ||
            !data.amountIn ||
            !data.decimalOut ||
            !data.netWorker ||
            !data.platform) {
            returns.flag = true;
            returns.msg = 'A required parameter is missing';
            return returns;
        }
        const amountIn = ethers_1.ethers.utils.parseUnits(data.amountIn.toString(), parseInt(data.decimalIn));
        let is_ok = true;
        let amountOut, pendingAmountOut;
        if (data.platform == 'uniswapV3') {
            const quoteAbi = uniswapv3_quote_json_1.abi;
            const quoter = new ethers_1.ethers.Contract(route_1.default[data.netWorker][data.platform].quote_addr, quoteAbi, this.ethWsProvider);
            const packKey = data.packKey.split(',');
            const packValue = data.packValue.split(',');
            this.logger.log('getPrice-v2-packkey:' + JSON.stringify(packKey));
            this.logger.log('getPrice-v2-packvalue:' + JSON.stringify(packValue));
            const path = ethers_1.utils.solidityPack(packKey, packValue);
            this.logger.log('getPrice-v2-path:' + JSON.stringify(packValue));
            try {
                amountOut = await quoter.callStatic.quoteExactInput(path, amountIn);
                if (data.isPending) {
                    const outcall = quoter.interface.encodeFunctionData('quoteExactInput', [path, amountIn]);
                    const res_out = await this.ethWsProvider.call({
                        data: outcall,
                        to: route_1.default[data.netWorker][data.platform].quote_addr,
                        value: ethers_1.ethers.utils.parseEther('0'),
                    }, 'pending');
                    this.logger.log(`getPrice-v2 pending res_out: ${res_out}`);
                    pendingAmountOut = converter.hexToDec(res_out.substring(res_out.length - 64));
                    this.logger.log(`getPrice-v2 pending pendingAmountOut: ${pendingAmountOut}`);
                }
            }
            catch (error) {
                is_ok = false;
                returns.flag = true;
                returns.msg = '获取token数量异常';
                this.logger.log('getPrice-error:' + JSON.stringify(error));
            }
        }
        else {
            let routeAbi;
            if (data.platform == 'uniswapV2') {
                routeAbi = uniswapv2_route_json_1.abi;
            }
            else if (data.platform == 'sushi') {
                routeAbi = sushi_route_json_1.abi;
            }
            else if (data.platform == 'pancakeV2') {
                routeAbi = pancake_route_json_1.abi;
            }
            else {
                returns.flag = true;
                returns.msg = 'platform is wrong';
                return returns;
            }
            const router = new ethers_1.ethers.Contract(route_1.default[data.netWorker][data.platform].route_addr, routeAbi, this.ethWsProvider);
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
                    const res_out = await this.ethWsProvider.call({
                        data: outcall,
                        to: route_1.default[data.netWorker][data.platform].route_addr,
                        value: ethers_1.ethers.utils.parseEther('0'),
                    }, 'pending');
                    this.logger.log(`getPrice pending res_out: ${res_out}`);
                    pendingAmountOut = converter.hexToDec(res_out.substring(res_out.length - 64));
                    this.logger.log(`getPrice pending pendingAmountOut: ${pendingAmountOut}`);
                }
            }
            catch (error) {
                is_ok = false;
                returns.flag = true;
                returns.msg = '获取token数量异常';
                this.logger.log('getPrice-error:' + JSON.stringify(error));
            }
        }
        this.logger.log(`getPrice amountOut0: ${amountOut} `);
        if (is_ok) {
            const amountOutInt = parseInt(amountOut.toString()) / 10 ** data.decimalOut;
            this.logger.log(`getPrice amountOutInt: ${amountOutInt} `);
            const price = data.amountIn / amountOutInt;
            if (data.isPending) {
                const pendingAmountOutInt = parseInt(pendingAmountOut.toString()) / 10 ** data.decimalOut;
                this.logger.log(`getPrice pendingAmountOutInt: ${pendingAmountOutInt} `);
                const pending_price = data.amountIn / pendingAmountOutInt;
                returns.data = { price: price, pending_price: pending_price };
            }
            else {
                returns.data = { price: price };
            }
        }
        this.logger.log('getPrice-end');
        return returns;
    }
    async getPoolFee(data) {
        this.logger.log('getPoolFee start 参数：' + JSON.stringify(data));
        let returns = { flag: false, data: {}, msg: '' };
        if (!this.checkWsProvider()) {
            returns.flag = true;
            returns.msg = 'ws provider closed';
            return returns;
        }
        if (!data.pool_id) {
            returns.flag = true;
            returns.msg = 'A required parameter is missing';
            return returns;
        }
        const pool_c = new ethers_1.ethers.Contract(data.pool_id, uniswapv3_pair_json_1.abi, this.ethWsProvider);
        try {
            const fee = await pool_c.fee();
            returns.data = { fee: fee };
        }
        catch (error) {
            returns.flag = true;
            returns.msg = '获取pool fee异常';
            this.logger.log('getPoolFee-error:' + JSON.stringify(error));
        }
        return returns;
    }
    async getHistoryBalance(data) {
        this.logger.log(`start` + ' 参数：' + JSON.stringify(data));
        let returns = { flag: false, data: {}, msg: '' };
        if (!data.from) {
            returns.flag = true;
            returns.msg = 'A required parameter is missing';
            return returns;
        }
        if (!this.checkWsProvider()) {
            returns.flag = true;
            returns.msg = 'ws provider closed';
            return returns;
        }
        let number = data.number;
        if (data.number != 'latest') {
            number = parseInt(data.number);
        }
        try {
            let balance = 0;
            if (data.tokenType == 'ETH') {
                balance = await this.ethWsProvider.getBalance(data.from, number);
            }
            else {
                const inter = new ethers_1.ethers.utils.Interface(erc20_json_1.abi);
                let data_out = inter.encodeFunctionData('balanceOf', [data.from]);
                const res = await this.ethWsProvider.call({
                    to: data.token,
                    data: data_out,
                }, number);
                balance = converter.hexToDec(res);
                this.logger.log('call data out:' + converter.hexToDec(res));
            }
            returns.data = { balance: balance.toString() };
        }
        catch (err) {
            returns.flag = true;
            returns.msg = '获取balance报错';
            this.logger.log('balance error:' + JSON.stringify(err));
        }
        this.logger.log('end ' + ' 结果：' + JSON.stringify(returns));
        return returns;
    }
};
TradeService = TradeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], TradeService);
exports.TradeService = TradeService;
//# sourceMappingURL=trade.service.js.map