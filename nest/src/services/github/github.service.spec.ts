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
    const ref = '9c16aaff3c0fe5bda4d8ffb418c4bb2b535eb420';
    const result = service.parseSourceCodeSnapshot(
      `git+https://github.com/near/cargo-near-new-project-template?rev=${ref}`,
    );
    expect(result).toEqual({
      repoUrl: 'https://github.com/near/cargo-near-new-project-template',
      sha: ref,
    });
  });

  it('should parse NEP-330 source code snapshot with fragment SHA', () => {
    const ref = '9c16aaff3c0fe5bda4d8ffb418c4bb2b535eb420';
    const result = service.parseSourceCodeSnapshot(
      `git+https://github.com/near/cargo-near-new-project-template.git#${ref}`,
    );
    expect(result).toEqual({
      repoUrl: 'https://github.com/near/cargo-near-new-project-template.git',
      sha: ref,
    });
  });

  it('should parse non-GitHub and symbolic git refs', () => {
    const result = service.parseSourceCodeSnapshot(
      'git+https://gitlab.com/user/repo.git?rev=v1.2.3',
    );

    expect(result).toEqual({
      repoUrl: 'https://gitlab.com/user/repo.git',
      sha: 'v1.2.3',
    });
  });

  it('should parse SSH source snapshots', () => {
    const result = service.parseSourceCodeSnapshot(
      'git+ssh://git@gitlab.com/user/repo.git?rev=feature/repro-build',
    );

    expect(result).toEqual({
      repoUrl: 'ssh://git@gitlab.com/user/repo.git',
      sha: 'feature/repro-build',
    });
  });

  it('should parse SCP-like SSH source snapshots', () => {
    const result = service.parseSourceCodeSnapshot(
      'git+git@gitlab.com:user/repo.git?rev=a80bc29',
    );

    expect(result).toEqual({
      repoUrl: 'git@gitlab.com:user/repo.git',
      sha: 'a80bc29',
    });
  });

  it('should reject source snapshots with conflicting refs', () => {
    expect(() =>
      service.parseSourceCodeSnapshot(
        'git+https://github.com/user/repo?rev=0123456789abcdef0123456789abcdef01234567#89abcdef0123456789abcdef0123456789abcdef',
      ),
    ).toThrow('Source snapshot must not contain conflicting git refs');
  });

  it('should reject unsafe refs', () => {
    expect(() =>
      service.parseSourceCodeSnapshot(
        'git+https://github.com/user/repo?rev=main;touch',
      ),
    ).toThrow('Source snapshot must pin a safe git ref');
  });

  it('should reject local filesystem source snapshots', () => {
    expect(() =>
      service.parseSourceCodeSnapshot('git+file:///tmp/repo?rev=main'),
    ).toThrow('Repository URL must use HTTPS, SSH, or git protocol');
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
      ['-c', 'advice.detachedHead=false', 'checkout', '--detach', '--', sha],
      { cwd: '/tmp/repo' },
    );
  });
});
