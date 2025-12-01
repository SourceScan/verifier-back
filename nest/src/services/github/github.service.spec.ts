import { Test, TestingModule } from '@nestjs/testing';
import { ExecService } from '../exec/exec.service';
import { GithubService } from './github.service';

describe('GithubService', () => {
  let service: GithubService;
  let execService: ExecService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubService,
        {
          provide: ExecService,
          useValue: {
            executeCommand: jest
              .fn()
              .mockResolvedValue({ stdout: [], stderr: [] }),
          },
        },
      ],
    }).compile();

    service = module.get<GithubService>(GithubService);
    execService = module.get<ExecService>(ExecService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should successfully clone a repository', async () => {
    await expect(service.clone('sourcePath', 'repo')).resolves.not.toThrow();
    expect(execService.executeCommand).toHaveBeenCalledWith(
      'sh /app/scripts/github/clone.sh sourcePath repo',
    );
  });

  it('should handle errors in clone method', async () => {
    const error = new Error('Clone failed');
    jest.spyOn(execService, 'executeCommand').mockRejectedValueOnce(error);
    await expect(service.clone('sourcePath', 'repo')).rejects.toThrow(error);
  });

  it('should parse source code snapshot', () => {
    const result = service.parseSourceCodeSnapshot(
      'git+https://github.com/user/repo?rev=abc123',
    );
    expect(result).toEqual({
      repoUrl: 'https://github.com/user/repo',
      sha: 'abc123',
    });
  });

  it('should get repo path', () => {
    const result = service.getRepoPath(
      '/tmp/folder',
      'https://github.com/user/my-repo.git',
    );
    expect(result).toBe('/tmp/folder/my-repo');
  });

  it('should successfully checkout a commit', async () => {
    await expect(
      service.checkout('/tmp/repo', 'abc123'),
    ).resolves.not.toThrow();
    expect(execService.executeCommand).toHaveBeenCalledWith(
      'sh /app/scripts/github/checkout.sh /tmp/repo abc123',
    );
  });
});
