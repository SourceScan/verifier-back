import { Injectable, Logger } from '@nestjs/common';
import { providers } from 'near-api-js';
import { QueryResponseKind } from 'near-api-js/lib/providers/provider';
import NearConfig from '../interfaces/near-config.interface';

@Injectable()
export class RpcService {
  private readonly logger = new Logger(RpcService.name);
  private provider: providers.Provider;

  constructor(private config: NearConfig) {
    this.initialize();
  }

  private async initialize() {
    this.provider = new providers.JsonRpcProvider({
      url: this.config.nodeUrl,
    });
  }

  async viewCode(accountId: string): Promise<QueryResponseKind> {
    try {
      const response = await this.provider.query({
        request_type: 'view_code',
        account_id: accountId,
        finality: 'final',
      });

      this.logger.log(`Code viewed for account ID: ${accountId}`);
      return response;
    } catch (error) {
      this.logger.error(
        `Error viewing code for account ID: ${accountId}`,
        error.stack,
      );
      throw error;
    }
  }
}
