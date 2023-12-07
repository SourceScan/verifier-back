import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let originalSecret: string | undefined;

  beforeEach(async () => {
    originalSecret = process.env.SECRET;
    process.env.SECRET = 'test-secret-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [EncryptionService],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    process.env.SECRET = originalSecret;
  });

  it('should encrypt and decrypt data correctly', () => {
    const testData = { key: 'value' };
    const encrypted = service.encrypt(testData);
    expect(typeof encrypted).toBe('string');

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toEqual(testData);
  });

  it('should throw an error if secret key is not defined for encrypt', () => {
    process.env.SECRET = '';
    expect(() => service.encrypt({ key: 'value' })).toThrow(
      'Encryption failed',
    );
  });

  it('should throw an error if secret key is not defined for decrypt', () => {
    process.env.SECRET = '';
    expect(() => service.decrypt('some encrypted data')).toThrow(
      'Decryption failed',
    );
  });

  // You can add more tests here to cover edge cases and error scenarios
});
