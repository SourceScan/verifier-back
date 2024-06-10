import { HttpException, Injectable, Logger } from '@nestjs/common';
import { providers } from 'near-api-js';
import {
  BlockId,
  BlockResult,
  QueryResponseKind,
} from 'near-api-js/lib/providers/provider';
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

  private byteArrayToString(byteArray: number[]): string {
    return String.fromCharCode(...byteArray);
  }

  async block(blockId?: BlockId): Promise<BlockResult> {
    try {
      const response = await this.provider.block({
        finality: 'final',
        blockId: blockId,
      });

      this.logger.log('Latest block details retrieved');

      return response;
    } catch (error) {
      this.logger.error('Error retrieving latest block details', error.stack);

      throw new HttpException(error.message, 500);
    }
  }

  async viewCode(
    accountId: string,
    blockId?: BlockId,
  ): Promise<QueryResponseKind> {
    try {
      const response = await this.provider.query({
        request_type: 'view_code',
        account_id: accountId,
        finality: 'final',
        blockId: blockId,
      });

      this.logger.log(`Code viewed for account ID: ${accountId}`);

      return response;
    } catch (error) {
      this.logger.error(
        `Error viewing code for account ID: ${accountId}`,
        error.stack,
      );

      throw new HttpException(error.message, 500);
    }
  }

  // TODO: Fix args
  async callFunction(
    accountId: string,
    methodName: string,
    blockId?: BlockId,
    args?: any[],
  ): Promise<any> {
    try {
      const response: any = await this.provider.query({
        request_type: 'call_function',
        blockId: blockId,
        finality: 'final',
        account_id: accountId,
        method_name: methodName,
        args_base64: args ? Buffer.from(args).toString('base64') : '',
      });

      this.logger.log(
        `Function ${methodName} called for account ID: ${accountId}`,
      );

      if (response && response.result) {
        const jsonString = this.byteArrayToString(response.result);
        response.result = JSON.parse(jsonString);
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Error calling function ${methodName} for account ID: ${accountId}`,
        error.stack,
      );

      throw new HttpException(error.message, 500);
    }
  }
}
