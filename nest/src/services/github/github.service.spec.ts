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
            executeFile: jest
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
    await expect(
      service.clone('sourcePath', 'https://github.com/user/repo'),
    ).resolves.not.toThrow();
    expect(execService.executeFile).toHaveBeenCalledWith(
      'git',
      ['clone', '--', 'https://github.com/user/repo'],
      { cwd: 'sourcePath' },
    );
  });

  it('should handle errors in clone method', async () => {
    const error = new Error('Clone failed');
    jest.spyOn(execService, 'executeFile').mockRejectedValueOnce(error);
    await expect(
      service.clone('sourcePath', 'https://github.com/user/repo'),
    ).rejects.toThrow(error);
  });

  it('should parse source code snapshot', () => {
    const sha = '0123456789abcdef0123456789abcdef01234567';
    const result = service.parseSourceCodeSnapshot(
      `git+https://github.com/user/repo?rev=${sha}`,
    );
    expect(result).toEqual({
      repoUrl: 'https://github.com/user/repo',
      sha,
    });
  });

  it('should reject non-GitHub source snapshots', () => {
    expect(() =>
      service.parseSourceCodeSnapshot(
        'git+ssh://example.com/user/repo?rev=0123456789abcdef0123456789abcdef01234567',
      ),
    ).toThrow('Repository URL must use HTTPS');
  });

  it('should get repo path', () => {
    const result = service.getRepoPath(
      '/tmp/folder',
      'https://github.com/user/my-repo.git',
    );
    expect(result).toBe('/tmp/folder/my-repo');
  });

  it('should successfully checkout a commit', async () => {
    const sha = '0123456789abcdef0123456789abcdef01234567';
    await expect(service.checkout('/tmp/repo', sha)).resolves.not.toThrow();
    expect(execService.executeFile).toHaveBeenCalledWith(
      'git',
      ['-c', 'advice.detachedHead=false', 'checkout', '--detach', sha],
      { cwd: '/tmp/repo' },
    );
  });
});
