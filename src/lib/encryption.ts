import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class Encryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 12; // 96 bits for GCM
  private static readonly AUTH_TAG_LENGTH = 16; // 128 bits

  private readonly key: Buffer;

  constructor(key?: Buffer) {
    this.key = key || randomBytes(Encryption.KEY_LENGTH);
  }

  encrypt(data: string): { encrypted: Buffer; iv: Buffer; authTag: Buffer } {
    const iv = randomBytes(Encryption.IV_LENGTH);
    const cipher = createCipheriv(Encryption.ALGORITHM, this.key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);

    return {
      encrypted,
      iv,
      authTag: cipher.getAuthTag()
    };
  }

  decrypt(encrypted: Buffer, iv: Buffer, authTag: Buffer): string {
    const decipher = createDecipheriv(Encryption.ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]).toString('utf8');
  }

  getKey(): Buffer {
    return Buffer.from(this.key);
  }

  static generateKey(): Buffer {
    return randomBytes(Encryption.KEY_LENGTH);
  }
}