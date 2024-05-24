import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { VerifyController } from './controllers/verify/verify.controller';
import { NearModule } from './modules/near/near.module';
import { BuilderInfoService } from './services/builder-info/builder-info.service';
import { CompilerService } from './services/compiler/compiler.service';
import { EncryptionService } from './services/encryption/encryption.service';
import { ExecService } from './services/exec/exec.service';
import { GithubService } from './services/github/github.service';
import { IpfsService } from './services/ipfs/ipfs.service';
import { RandomService } from './services/random/random.service';
import { TempService } from './services/temp/temp.service';

@Module({
  imports: [NearModule, ScheduleModule.forRoot()],
  controllers: [VerifyController],
  providers: [
    IpfsService,
    TempService,
    CompilerService,
    GithubService,
    EncryptionService,
    RandomService,
    ExecService,
    BuilderInfoService,
  ],
})
export class AppModule {}
