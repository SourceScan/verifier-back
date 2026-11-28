import { Test } from '@nestjs/testing';
import type { Response } from 'express';
import { CompilerService } from '../../services/compiler/compiler.service';
import { ExecService } from '../../services/exec/exec.service';
import { GithubService } from '../../services/github/github.service';
import { IpfsService } from '../../services/ipfs/ipfs.service';
import { TempService } from '../../services/temp/temp.service';
import { VerifyController } from './verify.controller';

describe('VerifyController snapshot', () => {
  const height = 165753012;
  const block = '56xEo2LorUFVNbkFhCncFSWNiobdp1kzm14nZ47b5JVW';
  const hash = '5KaX9FM9NtjpfahksL8TMWQk3LF7k8Sv88Qem4tGrVDW';
  const metadata = {
    block_hash: block,
    block_height: height,
    result: { build_info: { source_code_snapshot: 'snapshot' } },
  };
  const rpc = { callFunction: jest.fn(), viewCode: jest.fn() };
  const verifier = { getContract: jest.fn(), setContract: jest.fn() };
  const compiler = { verifyContract: jest.fn() };
  const ipfs = { addFolder: jest.fn() };
  const github = {
    parseSourceCodeSnapshot: () => ({ repoUrl: 'repo', sha: 'sha' }),
    clone: jest.fn(),
    checkout: jest.fn(),
    getRepoPath: () => 'path',
  };
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const verify = (blockId?: number) =>
    controller.verifyRust(
      { accountId: 'test.near', networkId: 'mainnet', blockId },
      response as unknown as Response,
    );
  let controller: VerifyController;

  beforeEach(async () => {
    jest.clearAllMocks();
    verifier.getContract.mockResolvedValue(null);
    rpc.callFunction.mockResolvedValue(metadata);
    rpc.viewCode.mockResolvedValue({
      block_hash: block,
      block_height: height,
      hash,
    });
    compiler.verifyContract.mockResolvedValue({
      stdout: [
        'The code obtained from the contract account ID and the code calculated from the repository are the same.',
        'Contract code hash: ' + hash,
      ],
    });
    ipfs.addFolder.mockResolvedValue('cid');
    const module = await Test.createTestingModule({
      controllers: [VerifyController],
      providers: [
        { provide: CompilerService, useValue: compiler },
        { provide: ExecService, useValue: {} },
        { provide: GithubService, useValue: github },
        {
          provide: TempService,
          useValue: { createFolder: () => 'tmp', deleteFolder: jest.fn() },
        },
        { provide: IpfsService, useValue: ipfs },
        { provide: 'MainnetRpcService', useValue: rpc },
        { provide: 'MainnetVerifierService', useValue: verifier },
        { provide: 'TestnetRpcService', useValue: {} },
        { provide: 'TestnetVerifierService', useValue: {} },
      ],
    }).compile();
    controller = module.get(VerifyController);
  });

  // blockId 0 keeps its historical meaning: the latest final block
  it.each([undefined, 0, height])(
    'pins every read after metadata (request block: %s)',
    async (requested) => {
      await verify(requested);
      expect(rpc.callFunction).toHaveBeenCalledWith(
        'test.near',
        'contract_source_metadata',
        requested,
      );
      expect(rpc.viewCode).toHaveBeenCalledWith('test.near', block);
      expect(compiler.verifyContract).toHaveBeenCalledWith(
        'test.near',
        'mainnet',
        block,
      );
      expect(verifier.setContract).toHaveBeenCalledWith(
        'test.near',
        'cid',
        hash,
        height,
        'rust',
      );
      expect(response.status).toHaveBeenCalledWith(200);
    },
  );

  it('does not sign or pin if the reported build hash differs from deployed code', async () => {
    rpc.viewCode.mockResolvedValueOnce({
      block_hash: block,
      block_height: height,
      hash: 'other',
    });
    await verify();
    expect(response.status).toHaveBeenCalledWith(400);
    expect(ipfs.addFolder).not.toHaveBeenCalled();
    expect(verifier.setContract).not.toHaveBeenCalled();
  });

  const expectNothingBuiltOrWritten = () => {
    expect(github.clone).not.toHaveBeenCalled();
    expect(compiler.verifyContract).not.toHaveBeenCalled();
    expect(ipfs.addFolder).not.toHaveBeenCalled();
    expect(verifier.setContract).not.toHaveBeenCalled();
  };

  // An unchanged hash needs no height check: nothing would be written
  it.each([height, height + 1, 'malformed'])(
    'returns the existing response for an already verified hash before building (record height: %s)',
    async (recordHeight) => {
      verifier.getContract.mockResolvedValueOnce({
        block_height: recordHeight,
        code_hash: hash,
      });
      await verify(height);
      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({
        message: "Code hash didn't change",
      });
      expectNothingBuiltOrWritten();
    },
  );

  it.each([height + 1, String(height + 1)])(
    'rejects a block older than the existing record (record height: %p)',
    async (recordHeight) => {
      verifier.getContract.mockResolvedValueOnce({
        block_height: recordHeight,
        code_hash: 'old',
      });
      await verify(height);
      expect(response.status).toHaveBeenCalledWith(409);
      expect(response.json).toHaveBeenCalledWith({
        message: `Block ${height} is older than the verified record for test.near at block ${height + 1}. Verify at block ${height + 1} or later.`,
      });
      expectNothingBuiltOrWritten();
    },
  );

  it.each([height, height - 1, String(height), String(height - 1), 0, '0'])(
    'verifies a block at or after the existing record (record height: %p)',
    async (recordHeight) => {
      verifier.getContract.mockResolvedValueOnce({
        block_height: recordHeight,
        code_hash: 'old',
      });
      await verify(height);
      expect(compiler.verifyContract).toHaveBeenCalledWith(
        'test.near',
        'mainnet',
        block,
      );
      expect(verifier.setContract).toHaveBeenCalledWith(
        'test.near',
        'cid',
        hash,
        height,
        'rust',
      );
      expect(response.status).toHaveBeenCalledWith(200);
    },
  );

  it.each([
    undefined,
    null,
    -1,
    1.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    '',
    ' 1',
    '-1',
    '1.5',
    '1e3',
    '0x10',
    '01',
    '9007199254740993',
    true,
    [1],
    {},
  ])(
    'refuses to compare against a malformed record height (%p)',
    async (recordHeight) => {
      verifier.getContract.mockResolvedValueOnce({
        block_height: recordHeight,
        code_hash: 'old',
      });
      await verify(height);
      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.json).toHaveBeenCalledWith({
        message:
          'Pre-verification checks failed: Invalid block height in registry record',
      });
      expectNothingBuiltOrWritten();
    },
  );

  it('returns 503 without building when the registry cannot be read', async () => {
    verifier.getContract.mockRejectedValueOnce(new Error('RPC timeout'));
    await verify(height);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({
      message:
        'Could not read the verifier registry for test.near. Please retry later.',
    });
    expect(rpc.callFunction).not.toHaveBeenCalled();
    expect(rpc.viewCode).not.toHaveBeenCalled();
    expectNothingBuiltOrWritten();
  });

  it('verifies when the registry has no record', async () => {
    verifier.getContract.mockResolvedValueOnce(null);
    await verify(height);
    expect(compiler.verifyContract).toHaveBeenCalled();
    expect(ipfs.addFolder).toHaveBeenCalled();
    expect(verifier.setContract).toHaveBeenCalledWith(
      'test.near',
      'cid',
      hash,
      height,
      'rust',
    );
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('rejects inconsistent RPC snapshots before building', async () => {
    rpc.viewCode.mockResolvedValueOnce({
      block_hash: 'other',
      block_height: height + 1,
      hash,
    });
    await verify();
    expect(response.status).toHaveBeenCalledWith(500);
    expect(compiler.verifyContract).not.toHaveBeenCalled();
    expect(verifier.setContract).not.toHaveBeenCalled();
  });

  it('rejects metadata from a block other than the requested one', async () => {
    await verify(height - 1);
    expect(response.status).toHaveBeenCalledWith(500);
    expect(rpc.viewCode).not.toHaveBeenCalled();
    expect(compiler.verifyContract).not.toHaveBeenCalled();
    expect(verifier.setContract).not.toHaveBeenCalled();
  });
});
