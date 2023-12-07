import { Injectable, Logger } from '@nestjs/common';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);

  private get secretKey(): string {
    const secret = process.env.SECRET;
    if (!secret || secret === '') {
      throw new Error('Encryption/Decryption secret key is not defined');
    }
    return secret;
  }

  public encrypt(data: any): string {
    try {
      const secret = this.secretKey; // Use getter to ensure the secret is valid
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(data),
        secret,
      ).toString();

      return encrypted;
    } catch (error) {
      this.logger.error('Encryption failed:', error.message);
      throw new Error('Encryption failed');
    }
  }

  public decrypt(data: string): any {
    try {
      const secret = this.secretKey; // Use getter to ensure the secret is valid
      const bytes = CryptoJS.AES.decrypt(data, secret);
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      return decryptedData;
    } catch (error) {
      this.logger.error('Decryption failed:', error.message);
      throw new Error('Decryption failed');
    }
  }
}
