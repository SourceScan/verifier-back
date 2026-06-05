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
    const sha = '9c16aaff3c0fe5bda4d8ffb418c4bb2b535eb420';
    const result = service.parseSourceCodeSnapshot(
      `git+https://github.com/near/cargo-near-new-project-template?rev=${sha}`,
    );
    expect(result).toEqual({
      repoUrl: 'https://github.com/near/cargo-near-new-project-template',
      sha,
    });
  });

  it('should parse NEP-330 source code snapshot with fragment SHA', () => {
    const sha = '9c16aaff3c0fe5bda4d8ffb418c4bb2b535eb420';
    const result = service.parseSourceCodeSnapshot(
      `git+https://github.com/near/cargo-near-new-project-template.git#${sha}`,
    );
    expect(result).toEqual({
      repoUrl: 'https://github.com/near/cargo-near-new-project-template.git',
      sha,
    });
  });

  it('should reject symbolic git refs', () => {
    expect(() =>
      service.parseSourceCodeSnapshot(
        'git+https://gitlab.com/user/repo.git?rev=v1.2.3',
      ),
    ).toThrow('Source snapshot must pin a full 40-character commit SHA');
  });

  it('should reject branch source snapshots', () => {
    expect(() =>
      service.parseSourceCodeSnapshot(
        'git+ssh://git@gitlab.com/user/repo.git?rev=feature/repro-build',
      ),
    ).toThrow('Source snapshot must pin a full 40-character commit SHA');
  });

  it('should reject short SHA source snapshots', () => {
    expect(() =>
      service.parseSourceCodeSnapshot(
        'git+git@gitlab.com:user/repo.git?rev=a80bc29',
      ),
    ).toThrow('Source snapshot must pin a full 40-character commit SHA');
  });

  it('should parse SCP-like SSH source snapshots pinned to full commit SHAs', () => {
    const sha = '0123456789abcdef0123456789abcdef01234567';
    const result = service.parseSourceCodeSnapshot(
      `git+git@gitlab.com:user/repo.git?rev=${sha}`,
    );

    expect(result).toEqual({
      repoUrl: 'git@gitlab.com:user/repo.git',
      sha,
    });
  });

  it('should reject source snapshots with conflicting SHAs', () => {
    expect(() =>
      service.parseSourceCodeSnapshot(
        'git+https://github.com/user/repo?rev=0123456789abcdef0123456789abcdef01234567#89abcdef0123456789abcdef0123456789abcdef',
      ),
    ).toThrow('Source snapshot must not contain conflicting commit SHAs');
  });

  it('should reject unsafe refs because they are not full commit SHAs', () => {
    expect(() =>
      service.parseSourceCodeSnapshot(
        'git+https://github.com/user/repo?rev=main;touch',
      ),
    ).toThrow('Source snapshot must pin a full 40-character commit SHA');
  });

  it('should reject local filesystem source snapshots', () => {
    const sha = '0123456789abcdef0123456789abcdef01234567';
    expect(() =>
      service.parseSourceCodeSnapshot(`git+file:///tmp/repo?rev=${sha}`),
    ).toThrow('Repository URL must use HTTPS or SSH');
  });

  it('should reject unauthenticated git protocol source snapshots', () => {
    const sha = '0123456789abcdef0123456789abcdef01234567';
    expect(() =>
      service.parseSourceCodeSnapshot(
        `git+git://github.com/user/repo?rev=${sha}`,
      ),
    ).toThrow('Repository URL must use HTTPS or SSH');
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

  it('should reject option-like refs before checkout', async () => {
    await expect(service.checkout('/tmp/repo', '--help')).rejects.toThrow(
      'Git checkout must use a full 40-character commit SHA',
    );
    expect(execService.executeFile).not.toHaveBeenCalledWith(
      'git',
      expect.arrayContaining(['--help']),
      expect.anything(),
    );
  });

  it('should reject short SHAs before checkout', async () => {
    await expect(service.checkout('/tmp/repo', 'a80bc29')).rejects.toThrow(
      'Git checkout must use a full 40-character commit SHA',
    );
    expect(execService.executeFile).not.toHaveBeenCalledWith(
      'git',
      expect.arrayContaining(['a80bc29']),
      expect.anything(),
    );
  });
});
