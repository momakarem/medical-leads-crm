import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class SnapchatTokenEncryptionService {
  constructor(private readonly config: ConfigService) {}
  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
  }
  decrypt(value: string): string {
    const [ivRaw, tagRaw, encryptedRaw] = value.split('.');
    if (!ivRaw || !tagRaw || !encryptedRaw) throw new InternalServerErrorException('Invalid encrypted Snapchat token format.');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivRaw, 'base64'));
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, 'base64')), decipher.final()]).toString('utf8');
  }
  private get key(): Buffer {
    const secret = this.config.get<string>('snapchat.tokenEncryptionKey');
    if (!secret) throw new InternalServerErrorException('SNAPCHAT_TOKEN_ENCRYPTION_KEY is not configured.');
    return createHash('sha256').update(secret).digest();
  }
}
