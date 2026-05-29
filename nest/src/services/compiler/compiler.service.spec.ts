import { Test, TestingModule } from '@nestjs/testing';
import { ExecService } from '../exec/exec.service';
import { CompilerService } from './compiler.service';

describe('CompilerService', () => {
  let compilerService: CompilerService;
  let execService: ExecService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CompilerService,
        {
          provide: ExecService,
          useValue: {
            executeFile: jest.fn(),
          },
        },
      ],
    }).compile();

    compilerService = moduleRef.get<CompilerService>(CompilerService);
    execService = moduleRef.get<ExecService>(ExecService);
  });

  it('should verify contract successfully', async () => {
    const mockOutput = ['Contract verified'];
    jest
      .spyOn(execService, 'executeFile')
      .mockResolvedValue({ stderr: [], stdout: mockOutput });

    const result = await compilerService.verifyContract('test.near', 'mainnet');
    expect(result.stdout).toEqual(mockOutput);
    expect(execService.executeFile).toHaveBeenCalledWith('near', [
      'contract',
      'verify',
      'deployed-at',
      'test.near',
      'network-config',
      'mainnet',
      'now',
    ]);
  });

  it('should handle errors in contract verification', async () => {
    const error = new Error('Verification error');
    jest.spyOn(execService, 'executeFile').mockRejectedValue(error);

    await expect(
      compilerService.verifyContract('test.near', 'mainnet'),
    ).rejects.toThrow(error);
  });

  it('should reject unsafe account IDs before executing', async () => {
    await expect(
      compilerService.verifyContract('test.near; touch /tmp/pwned', 'mainnet'),
    ).rejects.toThrow('Invalid NEAR account ID');
    expect(execService.executeFile).not.toHaveBeenCalled();
  });
});
