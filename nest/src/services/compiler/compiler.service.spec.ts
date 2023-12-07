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
            executeCommand: jest.fn(),
          },
        },
      ],
    }).compile();

    compilerService = moduleRef.get<CompilerService>(CompilerService);
    execService = moduleRef.get<ExecService>(ExecService);
  });

  it('should compile Rust code successfully', async () => {
    const mockOutput = 'Rust compilation output';
    jest
      .spyOn(execService, 'executeCommand')
      .mockResolvedValue({ stderr: '', stdout: mockOutput });

    const result = await compilerService.compileRust('sourcePath', 'destPath');
    expect(result.stdout).toBe(mockOutput);
    expect(execService.executeCommand).toHaveBeenCalledWith(
      'docker exec contract-builder sh /app/scripts/compiler/rust.sh sourcePath destPath',
    );
  });

  it('should handle errors in Rust compilation', async () => {
    const error = new Error('Compilation error');
    jest.spyOn(execService, 'executeCommand').mockRejectedValue(error);

    await expect(
      compilerService.compileRust('sourcePath', 'destPath'),
    ).rejects.toThrow(error);
  });

  it('should compile TypeScript code successfully', async () => {
    const mockOutput = 'TypeScript compilation output';
    jest
      .spyOn(execService, 'executeCommand')
      .mockResolvedValue({ stderr: '', stdout: mockOutput });

    const result = await compilerService.compileTypeScript('sourcePath');
    expect(result.stdout).toBe(mockOutput);
    expect(execService.executeCommand).toHaveBeenCalledWith(
      'sh /app/scripts/compiler/ts.sh sourcePath',
    );
  });

  it('should handle errors in TypeScript compilation', async () => {
    const error = new Error('Compilation error');
    jest.spyOn(execService, 'executeCommand').mockRejectedValue(error);

    await expect(
      compilerService.compileTypeScript('sourcePath'),
    ).rejects.toThrow(error);
  });
});
