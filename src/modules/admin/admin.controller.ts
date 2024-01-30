import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Body,
  Headers,
  Logger,
} from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}
  /**
   * 获取Token Decimals
   * @param data
   * @returns
   */
  @Post('getTokenDecimals')
  async getTokenDecimals(@Body() data) {
    return await this.adminService.getTokenDecimals(data);
  }

  /**
   * 转账转ETH
   * @param data
   * @returns
   */
  @Post('transferETH')
  async transfer(@Body() data) {
    return await this.adminService.transferETH(data);
  }

  /**
   * 转账转Token
   * @param data
   * @returns
   */
  @Post('transferToken')
  async transferToken(@Body() data) {
    return await this.adminService.transferToken(data);
  }
}
