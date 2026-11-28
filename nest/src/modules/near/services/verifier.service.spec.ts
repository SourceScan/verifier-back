import { HttpException } from '@nestjs/common';
import { KeyPair } from '@near-js/crypto';
import { VerifierService } from './verifier.service';

describe('VerifierService.getContract', () => {
  const record = {
    cid: 'cid',
    lang: 'rust',
    code_hash: '5KaX9FM9NtjpfahksL8TMWQk3LF7k8Sv88Qem4tGrVDW',
    block_height: 165753012,
    votes: [],
    comments: [],
  };
  const answer = (json: string) => ({
    result: [...Buffer.from(json)],
    logs: [],
    block_hash: '56xEo2LorUFVNbkFhCncFSWNiobdp1kzm14nZ47b5JVW',
    block_height: 165753100,
  });
  let service: VerifierService;
  let query: jest.Mock;

  beforeEach(() => {
    service = new VerifierService({
      accountId: 'registry.near',
      nodeUrl: 'http://127.0.0.1:1',
      privateKey: KeyPair.fromRandom('ed25519').toString(),
    } as any);
    query = jest.fn();
    (service as any).provider = { query };
  });

  it('reads the record from the registry at the final block', async () => {
    query.mockResolvedValueOnce(answer(JSON.stringify(record)));
    await expect(service.getContract('test.near')).resolves.toEqual(record);
    expect(query).toHaveBeenCalledWith({
      request_type: 'call_function',
      account_id: 'registry.near',
      method_name: 'get_contract',
      args_base64: Buffer.from('{"account_id":"test.near"}').toString('base64'),
      finality: 'final',
    });
  });

  it('returns null only for a genuinely absent record', async () => {
    query.mockResolvedValueOnce(answer('null'));
    await expect(service.getContract('test.near')).resolves.toBeNull();
  });

  it('throws a 503 when the registry RPC fails', async () => {
    query.mockRejectedValueOnce(new Error('fetch failed'));
    const error = await service.getContract('test.near').catch((e) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect(error.getStatus()).toBe(503);
  });

  it.each(['', 'not json', '{"code_hash":', '42', '"record"', 'true', '[]'])(
    'throws a 503 when the registry answer is not a record or null (%p)',
    async (json) => {
      query.mockResolvedValueOnce(answer(json));
      const error = await service.getContract('test.near').catch((e) => e);
      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(503);
    },
  );

  it('throws a 503 when the RPC answer has no result bytes', async () => {
    query.mockResolvedValueOnce({ logs: [] });
    const error = await service.getContract('test.near').catch((e) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect(error.getStatus()).toBe(503);
  });
});
