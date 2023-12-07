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
              .mockResolvedValue({ stdout: '', stderr: '' }),
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

  it('should get repo info', async () => {
    const result = await service.getRepoInfo(
      'https://github.com/2BeBuilt/near-explorer-contract',
      'f608387ed0992a91e3125643ebf529dd505a483d',
    );

    expect(result).toEqual({
      owner: '2BeBuilt',
      repo: 'near-explorer-contract',
      sha: 'f608387ed0992a91e3125643ebf529dd505a483d',
    });
  });
});
