import { Module } from '@nestjs/common';
import { mainnetConfig, testnetConfig } from './constants/near-configs';
import { RpcService } from './services/rpc.service';
import { VerifierService } from './services/verifier.service';

@Module({
  imports: [],
  providers: [
    {
      provide: 'MainnetVerifierService',
      useFactory: () => {
        return new VerifierService(mainnetConfig);
      },
    },
    {
      provide: 'TestnetVerifierService',
      useFactory: () => {
        return new VerifierService(testnetConfig);
      },
    },
    {
      provide: 'MainnetRpcService',
      useFactory: () => new RpcService(mainnetConfig),
    },
    {
      provide: 'TestnetRpcService',
      useFactory: () => new RpcService(testnetConfig),
    },
  ],
  exports: [
    'MainnetVerifierService',
    'TestnetVerifierService',
    'MainnetRpcService',
    'TestnetRpcService',
  ],
})
export class NearModule {}
