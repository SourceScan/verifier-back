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
  const reply = (result: unknown) => ({
    result,
    logs: [],
    block_hash: '56xEo2LorUFVNbkFhCncFSWNiobdp1kzm14nZ47b5JVW',
    block_height: 165753100,
  });
  // A well-formed call_function reply: the JSON answer as an array of bytes
  const answer = (json: string) => reply([...Buffer.from(json)]);
  // A record in raw JSON, so fields can hold values JSON.stringify can't write
  const recordJson = (fields: Record<string, string>) =>
    `{${Object.entries(fields)
      .map(([key, value]) => `"${key}":${value}`)
      .join(',')}}`;
  let service: VerifierService;
  let query: jest.Mock;

  const expectUnreadable = async () => {
    const error = await service.getContract('test.near').catch((e) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect(error.getStatus()).toBe(503);
  };

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
    await expectUnreadable();
  });

  it('throws a 503 when the RPC reply is missing', async () => {
    query.mockResolvedValueOnce(undefined);
    await expectUnreadable();
  });

  // Buffer.from also accepts strings, so a text "null" must not decode to
  // an absent record
  it.each([
    'null',
    JSON.stringify(record),
    undefined,
    null,
    42,
    {},
    { 0: 110, length: 1 },
    [256],
    [-1],
    [1.5],
    ['n'],
    [null],
  ])(
    'throws a 503 when the RPC result is not an array of bytes (%p)',
    async (result) => {
      query.mockResolvedValueOnce(reply(result));
      await expectUnreadable();
    },
  );

  it.each(['', 'not json', '{"code_hash":', '42', '"record"', 'true', '[]'])(
    'throws a 503 when the registry answer is not a record or null (%p)',
    async (json) => {
      query.mockResolvedValueOnce(answer(json));
      await expectUnreadable();
    },
  );

  it.each([undefined, 'null', '42', '""', '["hash"]', '{}'])(
    'throws a 503 when the record code_hash is not a non-empty string (%p)',
    async (codeHash) => {
      const fields: Record<string, string> = { block_height: '165753012' };
      if (codeHash !== undefined) fields.code_hash = codeHash;
      query.mockResolvedValueOnce(answer(recordJson(fields)));
      await expectUnreadable();
    },
  );

  it.each([
    ['165753012', 165753012],
    ['"165753012"', 165753012],
    ['0', 0],
    ['"0"', 0],
  ])(
    'returns block_height %s as the number %p',
    async (blockHeight, expected) => {
      query.mockResolvedValueOnce(
        answer(recordJson({ code_hash: '"hash"', block_height: blockHeight })),
      );
      await expect(service.getContract('test.near')).resolves.toEqual({
        code_hash: 'hash',
        block_height: expected,
      });
    },
  );

  it.each([
    undefined,
    'null',
    '-1',
    '1.5',
    '1e400',
    '9007199254740992',
    '9007199254740993',
    '""',
    '" 1"',
    '"-1"',
    '"1.5"',
    '"1e3"',
    '"0x10"',
    '"01"',
    '"9007199254740993"',
    'true',
    '[1]',
    '{}',
  ])(
    'throws a 503 when the record block_height is malformed (%p)',
    async (blockHeight) => {
      const fields: Record<string, string> = { code_hash: '"hash"' };
      if (blockHeight !== undefined) fields.block_height = blockHeight;
      query.mockResolvedValueOnce(answer(recordJson(fields)));
      await expectUnreadable();
    },
  );
});
