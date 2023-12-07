import { Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { CompileController } from './controllers/compile/compile.controller';
import { GatewayController } from './controllers/gateway/gateway.controller';
import { IpfsController } from './controllers/ipfs/ipfs.controller';
import { TempController } from './controllers/temp/temp.controller';
import { VerifyController } from './controllers/verify/verify.controller';
import { NearModule } from './modules/near/near.module';
import { AuthService } from './services/auth/auth.service';
import { BuilderInfoService } from './services/builder-info/builder-info.service';
import { CompilerService } from './services/compiler/compiler.service';
import { EncryptionService } from './services/encryption/encryption.service';
import { ExecService } from './services/exec/exec.service';
import { GithubService } from './services/github/github.service';
import { IpfsService } from './services/ipfs/ipfs.service';
import { RandomService } from './services/random/random.service';
import { TempService } from './services/temp/temp.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.SECRET,
      signOptions: { expiresIn: `${process.env.JWT_EXPIRATION}m` },
    }),
    NearModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [
    CompileController,
    TempController,
    IpfsController,
    GatewayController,
    VerifyController,
  ],
  providers: [
    IpfsService,
    TempService,
    CompilerService,
    GithubService,
    EncryptionService,
    RandomService,
    ExecService,
    AuthService,
    BuilderInfoService,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    private execService: ExecService,
    private builderInfoService: BuilderInfoService,
  ) {}

  async onModuleInit() {
    const { stdout } = await this.execService.executeCommand(
      'docker inspect nearprotocol/contract-builder:latest-amd64',
    );
    const jsonData = JSON.parse(stdout);
    const builderImage = jsonData[0].RepoDigests[0];
    this.builderInfoService.setBuilderImage(builderImage);
  }
}
