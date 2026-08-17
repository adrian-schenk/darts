import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const DEFAULT_WINDOW = 1;

@Injectable()
export class TotpService {
  generateSecret(length = 20): string {
    return randomBytes(length)
      .toString('base64')
      .replace(/[^A-Za-z2-7]/g, '')
      .slice(0, 32);
  }

  generateOtpAuthUrl(
    secret: string,
    account: string,
    issuer = 'OpenDarts',
  ): string {
    return [
      'otpauth://totp',
      `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`,
      `?secret=${secret}`,
      `&issuer=${encodeURIComponent(issuer)}`,
      '&algorithm=SHA1',
      '&digits=6',
      '&period=30',
    ].join('');
  }

  verify(secret: string, token: string, window = DEFAULT_WINDOW): boolean {
    if (!secret || !token) return false;
    const normalized = token.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(normalized)) return false;

    const counter = Math.floor(Date.now() / 1000);
    for (let offset = -window; offset <= window; offset += 1) {
      if (this.generateToken(secret, counter + offset) === normalized) {
        return true;
      }
    }
    return false;
  }

  private generateToken(secret: string, counter: number): string {
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    counterBuffer.writeUInt32BE(counter >>> 0, 4);

    const hmac = createHmac('sha1', this.base32Decode(secret))
      .update(counterBuffer)
      .digest();

    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    return (binary % 1000000).toString().padStart(6, '0');
  }

  private base32Decode(input: string): Buffer {
    const output: number[] = [];
    let bits = 0;
    let value = 0;

    for (const char of input.toUpperCase()) {
      const index = BASE32_ALPHABET.indexOf(char);
      if (index === -1) continue;

      value = (value << 5) | index;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }
}
