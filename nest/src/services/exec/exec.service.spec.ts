import { Test, TestingModule } from '@nestjs/testing';
import * as cp from 'child_process';
import { ExecException } from '../../exceptions/exec.exception';
import { ExecService } from './exec.service';

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

describe('ExecService', () => {
  let service: ExecService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExecService],
    }).compile();

    service = module.get<ExecService>(ExecService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should execute command successfully', async () => {
    const mockExec = cp.exec as unknown as jest.Mock;
    mockExec.mockImplementation((cmd, callback) =>
      callback(null, { stdout: 'success', stderr: '' }),
    );

    await expect(service.executeCommand('echo "Hello World"')).resolves.toEqual(
      {
        stdout: 'success',
        stderr: '',
      },
    );
  });

  it('should throw ExecException when stderr contains errors', async () => {
    const mockExec = cp.exec as unknown as jest.Mock;
    mockExec.mockImplementation((cmd, callback) =>
      callback(null, { stdout: '', stderr: 'error: something went wrong' }),
    );

    await expect(service.executeCommand('someCommand')).rejects.toThrow(
      ExecException,
    );
  });

  it('should throw ExecException on command execution failure', async () => {
    const mockExec = cp.exec as unknown as jest.Mock;
    mockExec.mockImplementation((cmd, callback) =>
      callback(new Error('Execution failed'), { stdout: '', stderr: '' }),
    );

    await expect(service.executeCommand('faultyCommand')).rejects.toThrow(
      ExecException,
    );
  });
});
