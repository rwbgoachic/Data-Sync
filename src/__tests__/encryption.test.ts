import { Encryption } from '../lib/encryption';

describe('Encryption', () => {
  let encryption: Encryption;
  const testData = 'Sensitive transaction data';

  beforeEach(() => {
    encryption = new Encryption();
  });

  test('encrypts and decrypts data correctly', () => {
    const { encrypted, iv, authTag } = encryption.encrypt(testData);
    const decrypted = encryption.decrypt(encrypted, iv, authTag);
    expect(decrypted).toBe(testData);
  });

  test('generates different IVs for same plaintext', () => {
    const result1 = encryption.encrypt(testData);
    const result2 = encryption.encrypt(testData);
    expect(result1.iv.equals(result2.iv)).toBe(false);
  });

  test('fails to decrypt with wrong key', () => {
    const { encrypted, iv, authTag } = encryption.encrypt(testData);
    const wrongEncryption = new Encryption();
    expect(() => {
      wrongEncryption.decrypt(encrypted, iv, authTag);
    }).toThrow();
  });

  test('generates valid keys', () => {
    const key = Encryption.generateKey();
    expect(key.length).toBe(32); // 256 bits
    const encryptionWithKey = new Encryption(key);
    const { encrypted, iv, authTag } = encryptionWithKey.encrypt(testData);
    const decrypted = encryptionWithKey.decrypt(encrypted, iv, authTag);
    expect(decrypted).toBe(testData);
  });
});