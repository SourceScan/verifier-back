import { isValidCommitSha, isValidNearAccountId } from './validation.constants';

describe('validation constants', () => {
  it('should accept real NEAR account ID formats', () => {
    const validAccountIds = [
      'sourcescan.near',
      'v2-verifier.sourcescan.near',
      'wrap.near',
      'aurora',
      'dev-123.testnet',
      'b-o_w_e-n',
      '98793cd91a3f870fb126f66285808c7e094afcfc4eda8a970f6648cdf0dbd6de',
      '0x87b435f1fcb4519306f9b755e274107cc78ac4e3',
      '0s87b435f1fcb4519306f9b755e274107cc78ac4e3',
    ];

    for (const accountId of validAccountIds) {
      expect(isValidNearAccountId(accountId)).toBe(true);
    }
  });

  it('should reject invalid NEAR account IDs', () => {
    const invalidAccountIds = [
      '',
      'a',
      'SourceScan.near',
      '-near',
      'near-',
      '.near',
      'near.',
      'a..near',
      '0__0',
      '0_-_0',
      'hello world',
      'near;touch',
      'abcdefghijklmnopqrstuvwxyz.abcdefghijklmnopqrstuvwxyz.abcdefghijklmnopqrstuvwxyz',
    ];

    for (const accountId of invalidAccountIds) {
      expect(isValidNearAccountId(accountId)).toBe(false);
    }
  });

  it('should validate full commit SHAs only', () => {
    expect(isValidCommitSha('0123456789abcdef0123456789abcdef01234567')).toBe(
      true,
    );
    expect(isValidCommitSha('a80bc29')).toBe(false);
    expect(isValidCommitSha('main')).toBe(false);
  });
});
