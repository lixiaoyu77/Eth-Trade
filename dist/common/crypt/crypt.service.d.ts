import { Logger } from "@nestjs/common";
export declare class CryptService {
    readonly logger: Logger;
    encrypt_ctr(plaintext: any, passphrase: any): string;
    decrypt_ctr(ciphertext: any, passphrase: any): string;
    encrypt_normal(plaintext: any): string;
    decrypt_normal(ciphertext: any): string;
    randomString(e: any): string;
}
