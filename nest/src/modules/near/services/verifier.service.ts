import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Account, Contract, connect, keyStores, utils } from 'near-api-js';
import ContractData from '../interfaces/contract-data.interface';
import NearConfig from '../interfaces/near-config.interface';

@Injectable()
export class VerifierService {
  private readonly logger = new Logger(VerifierService.name);
  private readonly keyStore: keyStores.InMemoryKeyStore;
  private account: Account;
  private contract: any;

  constructor(private config: NearConfig) {
    const keyPair = utils.KeyPair.fromString(config.privateKey);

    this.keyStore = new keyStores.InMemoryKeyStore();
    this.keyStore.setKey(config.networkId, config.accountId, keyPair);

    this.initialize();
  }

  private async initialize() {
    const near = await connect({
      keyStore: this.keyStore,
      networkId: this.config.networkId,
      nodeUrl: this.config.nodeUrl,
      walletUrl: this.config.walletUrl,
      helperUrl: this.config.helperUrl,
    });

    this.account = new Account(near.connection, this.config.accountId);
  }

  async initializeContract(): Promise<void> {
    this.contract = new Contract(this.account, this.account.accountId, {
      viewMethods: ['get_contract'],
      changeMethods: ['set_contract'],
    }) as any;
  }

  async getContract(accountId: string): Promise<ContractData | null> {
    if (!this.contract) {
      await this.initializeContract();
    }

    this.logger.log(`Fetching contract data for account ID: ${accountId}`);

    try {
      const contractData: ContractData = await this.contract.get_contract({
        account_id: accountId,
      });

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
    lang: string,
  ): Promise<void> {
    if (!this.contract) {
      await this.initializeContract();
    }

    this.logger.log(`Setting contract for account ID: ${accountId}`);

    try {
      await this.contract.set_contract({
        args: {
          account_id: accountId,
          cid: cid,
          code_hash: codeHash,
          lang: lang,
        },
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
}
