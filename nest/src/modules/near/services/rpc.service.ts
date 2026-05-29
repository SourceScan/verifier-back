import { HttpException, Injectable, Logger } from '@nestjs/common';
import type { JsonRpcProvider, QueryResponseKind } from 'near-api-js';
import NearConfig from '../interfaces/near-config.interface';

type BlockResult = Awaited<ReturnType<JsonRpcProvider['viewBlock']>>;

@Injectable()
export class RpcService {
  private readonly logger = new Logger(RpcService.name);
  private provider: JsonRpcProvider;
  private readonly ready: Promise<void>;

  constructor(private config: NearConfig) {
    this.ready = this.initialize();
  }

  private async initialize() {
    const { JsonRpcProvider } = await import('near-api-js');

    this.provider = new JsonRpcProvider({
      url: this.config.nodeUrl,
    });
  }

  private byteArrayToString(byteArray: number[]): string {
    return String.fromCharCode(...byteArray);
  }

  async block(blockId?: number): Promise<BlockResult> {
    await this.ready;

    try {
      const response = await this.provider.viewBlock(
        blockId ? { blockId } : { finality: 'final' },
      );

      this.logger.log('Latest block details retrieved');

      return response;
    } catch (error) {
      this.logger.error('Error retrieving latest block details', error.stack);

      throw new HttpException(error.message, 500);
    }
  }

  async viewCode(
    accountId: string,
    blockId?: number,
  ): Promise<QueryResponseKind> {
    await this.ready;

    try {
      const queryParams: any = {
        request_type: 'view_code',
        account_id: accountId,
      };

      if (blockId) {
        queryParams.block_id = blockId;
      } else {
        queryParams.finality = 'final';
      }

      const response = await this.provider.query(queryParams);

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

  async callFunction(
    accountId: string,
    methodName: string,
    blockId?: number,
    args?: any[],
  ): Promise<any> {
    await this.ready;

    try {
      const queryParams: any = {
        request_type: 'call_function',
        account_id: accountId,
        method_name: methodName,
        args_base64: args ? Buffer.from(args).toString('base64') : '',
      };

      if (blockId) {
        queryParams.block_id = blockId;
      } else {
        queryParams.finality = 'final';
      }

      const response: any = await this.provider.query(queryParams);

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
