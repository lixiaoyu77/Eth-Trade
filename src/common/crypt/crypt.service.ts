import { createCipheriv, createDecipheriv, randomBytes, scrypt ,pbkdf2Sync} from 'crypto';
import { Injectable, Logger } from "@nestjs/common";
import { Base64 } from "js-base64"

@Injectable()
export class CryptService {
    public readonly logger = new Logger(CryptService.name);

    /**
     * aes-256-ctr 加密
     * @param plaintext 需要加密的字符串
     * @param passphrase 加密密钥
     * @returns 返回base64的加密字符串
     */
    encrypt_ctr(plaintext, passphrase) {
        const salt = randomBytes(16);
        const iv = randomBytes(16);
        const key = pbkdf2Sync(passphrase, salt, 10000, 32, 'sha256');    
        const cipher = createCipheriv('aes-256-ctr', key, iv);
        const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        var output = Buffer.concat([salt, iv, ciphertext]);    
        return output.toString('base64');
    }

    /**
     * aes-256-ctr 解密
     * @param ciphertext 解密的字符串
     * @param passphrase 加密密钥
     * @returns 返回解密后的字符串
     */
    decrypt_ctr(ciphertext, passphrase) {
        const input = new Buffer(ciphertext, 'base64');
        const salt = input.slice(0, 16);
        const iv = input.slice(16, 32);
        ciphertext = input.slice(32);
        const key = pbkdf2Sync(passphrase, salt, 10000, 32, 'sha256');    
        const cipher = createDecipheriv('aes-256-ctr', key, iv);
        const plaintext = Buffer.concat([cipher.update(ciphertext), cipher.final()]);    
        return plaintext.toString('utf-8');
    }

    /**
     * base64普通加密
     */
    encrypt_normal(plaintext) {
        const code = plaintext.substring(2);
        const new_code = this.randomString(6) + code.substring(0,6) + this.randomString(6) + code.substring(6) + this.randomString(6);
        const base64_code =  Base64.encode(new_code);
        return base64_code;
    }

    /**
     * base64普通解密
     */
    decrypt_normal(ciphertext) {
        const str_code = Base64.decode(ciphertext);
        const len = str_code.length;
        const str_code2 = str_code.substring(0, len - 6);
        const str_code3 = str_code2.substring(6);
        const str_code4 = str_code3.substring(0, 6);
        const str_code5 = str_code3.substring(12);
        const real_code = str_code4.concat(str_code5);  
        return real_code;
    }

    randomString(e:any) {
        e = e || 32;
        let t = "abcdefghijklmnopqrstuvwxyz0123456789",
        a = t.length,
        n = "";
        for (let i = 0; i < e; i++) n += t.charAt(Math.floor(Math.random() * a));
        return n
    }
}