"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CryptService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptService = void 0;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const js_base64_1 = require("js-base64");
let CryptService = CryptService_1 = class CryptService {
    constructor() {
        this.logger = new common_1.Logger(CryptService_1.name);
    }
    encrypt_ctr(plaintext, passphrase) {
        const salt = (0, crypto_1.randomBytes)(16);
        const iv = (0, crypto_1.randomBytes)(16);
        const key = (0, crypto_1.pbkdf2Sync)(passphrase, salt, 10000, 32, 'sha256');
        const cipher = (0, crypto_1.createCipheriv)('aes-256-ctr', key, iv);
        const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        var output = Buffer.concat([salt, iv, ciphertext]);
        return output.toString('base64');
    }
    decrypt_ctr(ciphertext, passphrase) {
        const input = new Buffer(ciphertext, 'base64');
        const salt = input.slice(0, 16);
        const iv = input.slice(16, 32);
        ciphertext = input.slice(32);
        const key = (0, crypto_1.pbkdf2Sync)(passphrase, salt, 10000, 32, 'sha256');
        const cipher = (0, crypto_1.createDecipheriv)('aes-256-ctr', key, iv);
        const plaintext = Buffer.concat([cipher.update(ciphertext), cipher.final()]);
        return plaintext.toString('utf-8');
    }
    encrypt_normal(plaintext) {
        const code = plaintext.substring(2);
        const new_code = this.randomString(6) + code.substring(0, 6) + this.randomString(6) + code.substring(6) + this.randomString(6);
        const base64_code = js_base64_1.Base64.encode(new_code);
        return base64_code;
    }
    decrypt_normal(ciphertext) {
        const str_code = js_base64_1.Base64.decode(ciphertext);
        const len = str_code.length;
        const str_code2 = str_code.substring(0, len - 6);
        const str_code3 = str_code2.substring(6);
        const str_code4 = str_code3.substring(0, 6);
        const str_code5 = str_code3.substring(12);
        const real_code = str_code4.concat(str_code5);
        return real_code;
    }
    randomString(e) {
        e = e || 32;
        let t = "abcdefghijklmnopqrstuvwxyz0123456789", a = t.length, n = "";
        for (let i = 0; i < e; i++)
            n += t.charAt(Math.floor(Math.random() * a));
        return n;
    }
};
CryptService = CryptService_1 = __decorate([
    (0, common_1.Injectable)()
], CryptService);
exports.CryptService = CryptService;
//# sourceMappingURL=crypt.service.js.map