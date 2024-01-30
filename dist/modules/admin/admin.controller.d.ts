import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getTokenDecimals(data: any): Promise<any>;
    transfer(data: any): Promise<{
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
