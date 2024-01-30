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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeController = void 0;
const common_1 = require("@nestjs/common");
const trade_service_1 = require("./trade.service");
let TradeController = class TradeController {
    constructor(tradeService) {
        this.tradeService = tradeService;
    }
    async getEthBalance(data) {
        return await this.tradeService.getEthBalance(data);
    }
    async getPrice(data) {
        return await this.tradeService.getPrice(data);
    }
    async getPoolFee(data) {
        return await this.tradeService.getPoolFee(data);
    }
    async getHistoryBalance(data) {
        return await this.tradeService.getHistoryBalance(data);
    }
};
__decorate([
    (0, common_1.Post)('getEthBalance'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TradeController.prototype, "getEthBalance", null);
__decorate([
    (0, common_1.Post)('getPrice'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TradeController.prototype, "getPrice", null);
__decorate([
    (0, common_1.Post)('getPoolFee'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TradeController.prototype, "getPoolFee", null);
__decorate([
    (0, common_1.Post)('getHistoryBalance'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TradeController.prototype, "getHistoryBalance", null);
TradeController = __decorate([
    (0, common_1.Controller)('/trade'),
    __metadata("design:paramtypes", [trade_service_1.TradeService])
], TradeController);
exports.TradeController = TradeController;
//# sourceMappingURL=trade.controller.js.map