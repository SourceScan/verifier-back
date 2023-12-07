import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let authGuard: AuthGuard;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    authGuard = module.get<AuthGuard>(AuthGuard);
    jwtService = module.get<JwtService>(JwtService);
  });

  const mockExecutionContext = (authorization?: string): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization },
        }),
      }),
    } as ExecutionContext;
  };

  it('should throw UnauthorizedException if no token is provided', async () => {
    const context = mockExecutionContext();
    await expect(authGuard.canActivate(context)).rejects.toThrowError(
      UnauthorizedException,
    );
  });

  it('should validate and pass for a valid token', async () => {
    jest
      .spyOn(jwtService, 'verifyAsync')
      .mockResolvedValue({ valid: 'payload' });
    const context = mockExecutionContext('Bearer valid-token');
    await expect(authGuard.canActivate(context)).resolves.toBe(true);
  });

  it('should throw UnauthorizedException for an invalid token', async () => {
    jest
      .spyOn(jwtService, 'verifyAsync')
      .mockRejectedValue(new Error('Invalid token'));
    const context = mockExecutionContext('Bearer invalid-token');
    await expect(authGuard.canActivate(context)).rejects.toThrowError(
      UnauthorizedException,
    );
  });
});
