import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import GithubData from '../../modules/near/interfaces/github-data.interface';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const jwtServiceMock = {
      signAsync: jest.fn().mockResolvedValue('mockToken'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should generate a JWT token', async () => {
    const path = 'test/path';
    const githubData: GithubData = {
      owner: 'testOwner',
      repo: 'testRepo',
      sha: 'testSha',
    };

    const token = await authService.genJwtKey(path, githubData);

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sourcePath: path,
      github: githubData,
    });
    expect(token).toBe('mockToken');
  });
});
