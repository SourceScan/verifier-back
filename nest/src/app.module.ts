import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ContractsController } from './controllers/contracts/contracts.controller';
import { IpfsController } from './controllers/ipfs/ipfs.controller';
import { VerifyController } from './controllers/verify/verify.controller';
import { NearModule } from './modules/near/near.module';
import { CompilerService } from './services/compiler/compiler.service';
import { DockerCleanupService } from './services/docker-cleanup/docker-cleanup.service';
import { ExecService } from './services/exec/exec.service';
import { GithubService } from './services/github/github.service';
import { IpfsService } from './services/ipfs/ipfs.service';
import { RandomService } from './services/random/random.service';
import { TempService } from './services/temp/temp.service';

@Module({
  imports: [NearModule, ScheduleModule.forRoot()],
  controllers: [VerifyController, IpfsController, ContractsController],
  providers: [
    IpfsService,
    TempService,
    CompilerService,
    GithubService,
    RandomService,
    ExecService,
    DockerCleanupService,
  ],
})
export class AppModule {}
