import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import GithubData from '../../modules/near/interfaces/github-data.interface';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async genJwtKey(path: string, github: GithubData) {
    const payload = { sourcePath: path, github: github };
    return await this.jwtService.signAsync(payload);
  }
}
