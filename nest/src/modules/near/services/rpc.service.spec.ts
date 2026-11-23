import { RpcService } from './rpc.service';

describe('RpcService block selection', () => {
  const blockHash = '56xEo2LorUFVNbkFhCncFSWNiobdp1kzm14nZ47b5JVW';
  let service: RpcService;
  let query: jest.Mock;

  beforeEach(() => {
    service = new RpcService({ nodeUrl: 'http://127.0.0.1:1' } as any);
    query = jest.fn().mockResolvedValue({
      result: [...Buffer.from('{}')],
      block_hash: blockHash,
      block_height: 1,
    });
    (service as any).provider = { query };
  });

  it.each([undefined, 0])(
    'reads metadata from the final block when blockId is %s',
    async (blockId) => {
      await service.callFunction(
        'test.near',
        'contract_source_metadata',
        blockId,
      );
      expect(query.mock.calls[0][0]).toMatchObject({ finality: 'final' });
      expect(query.mock.calls[0][0]).not.toHaveProperty('block_id');
    },
  );

  it('reads metadata from the requested block height', async () => {
    await service.callFunction('test.near', 'contract_source_metadata', 42);
    expect(query.mock.calls[0][0]).toMatchObject({ block_id: 42 });
    expect(query.mock.calls[0][0]).not.toHaveProperty('finality');
  });

  it('reads deployed code only at the given block hash', async () => {
    await service.viewCode('test.near', blockHash);
    expect(query.mock.calls[0][0]).toEqual({
      request_type: 'view_code',
      account_id: 'test.near',
      block_id: blockHash,
    });
  });
});
