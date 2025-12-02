import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Account, utils } from 'near-api-js';
import { JsonRpcProvider } from '@near-js/providers';
import { KeyPairSigner } from '@near-js/signers';
import { KeyPairString } from '@near-js/crypto';
import { actionCreators } from '@near-js/transactions';
import ContractData from '../interfaces/contract-data.interface';
import NearConfig from '../interfaces/near-config.interface';

interface RpcQueryResult {
  result: number[];
  logs: string[];
  block_height: number;
  block_hash: string;
}

@Injectable()
export class VerifierService {
  private readonly logger = new Logger(VerifierService.name);
  private account: Account;
  private provider: JsonRpcProvider;

  constructor(private config: NearConfig) {
    this.initialize();
  }

  private initialize() {
    const keyPair = utils.KeyPair.fromString(
      this.config.privateKey as KeyPairString,
    );

    this.provider = new JsonRpcProvider({
      url: this.config.nodeUrl,
    });
    const signer = new KeyPairSigner(keyPair);

    this.account = new Account(this.config.accountId, this.provider, signer);
  }

  async getContract(accountId: string): Promise<ContractData | null> {
    this.logger.log(`Fetching contract data for account ID: ${accountId}`);

    try {
      const result = await this.provider.query<RpcQueryResult>({
        request_type: 'call_function',
        account_id: this.config.accountId,
        method_name: 'get_contract',
        args_base64: Buffer.from(
          JSON.stringify({ account_id: accountId }),
        ).toString('base64'),
        finality: 'final',
      });

      const contractData: ContractData = JSON.parse(
        Buffer.from(result.result).toString(),
      );

      this.logger.log(
        `Contract data fetched successfully for account ID: ${accountId}`,
      );
      return contractData;
    } catch (error) {
      this.logger.error(
        `Error fetching contract data for account ID: ${accountId}`,
        error.stack,
      );
      return null;
    }
  }

  async setContract(
    accountId: string,
    cid: string,
    codeHash: string,
    blockHeight: number,
    lang: string,
  ): Promise<void> {
    this.logger.log(`Setting contract for account ID: ${accountId}`);

    try {
      const args = {
        account_id: accountId,
        cid: cid,
        code_hash: codeHash,
        block_height: blockHeight,
        lang: lang,
      };

      await this.account.signAndSendTransaction({
        receiverId: this.config.accountId,
        actions: [
          actionCreators.functionCall(
            'set_contract',
            args,
            BigInt('30000000000000'),
            BigInt('0'),
          ),
        ],
      });

      this.logger.log(`Contract set successfully for account ID: ${accountId}`);
    } catch (error) {
      this.logger.error(
        `Error setting contract for account ID: ${accountId}`,
        error.stack,
      );
      throw new HttpException(error.message, 500);
    }
  }

  async getContractsCount(): Promise<number> {
    this.logger.log('Fetching contracts count');

    try {
      const result = await this.provider.query<RpcQueryResult>({
        request_type: 'call_function',
        account_id: this.config.accountId,
        method_name: 'get_contracts_count',
        args_base64: Buffer.from(JSON.stringify({})).toString('base64'),
        finality: 'final',
      });

      const count: number = JSON.parse(Buffer.from(result.result).toString());

      this.logger.log(`Contracts count: ${count}`);
      return count;
    } catch (error) {
      this.logger.error('Error fetching contracts count', error.stack);
      throw new HttpException('Failed to fetch contracts count', 500);
    }
  }

  async getContractsByCodeHash(codeHash: string): Promise<ContractData[]> {
    this.logger.log(`Fetching contracts by code hash: ${codeHash}`);

    try {
      const result = await this.provider.query<RpcQueryResult>({
        request_type: 'call_function',
        account_id: this.config.accountId,
        method_name: 'get_contracts_by_code_hash',
        args_base64: Buffer.from(
          JSON.stringify({ code_hash: codeHash }),
        ).toString('base64'),
        finality: 'final',
      });

      const contracts: ContractData[] = JSON.parse(
        Buffer.from(result.result).toString(),
      );

      this.logger.log(
        `Found ${contracts.length} contracts with code hash: ${codeHash}`,
      );
      return contracts;
    } catch (error) {
      this.logger.error(
        `Error fetching contracts by code hash: ${codeHash}`,
        error.stack,
      );
      throw new HttpException('Failed to fetch contracts by code hash', 500);
    }
  }
}
