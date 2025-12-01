import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Account, Contract, utils, providers } from 'near-api-js';
import { KeyPairSigner } from '@near-js/signers';
import { KeyPairString } from '@near-js/crypto';
import ContractData from '../interfaces/contract-data.interface';
import NearConfig from '../interfaces/near-config.interface';

@Injectable()
export class VerifierService {
  private readonly logger = new Logger(VerifierService.name);
  private account: Account;
  private contract: any;

  constructor(private config: NearConfig) {
    this.initialize();
  }

  private initialize() {
    const keyPair = utils.KeyPair.fromString(
      this.config.privateKey as KeyPairString,
    );

    const provider = new providers.JsonRpcProvider({
      url: this.config.nodeUrl,
    });
    const signer = new KeyPairSigner(keyPair);

    this.account = new Account(this.config.accountId, provider, signer);
  }

  async initializeContract(): Promise<void> {
    this.contract = new Contract(this.account, this.account.accountId, {
      viewMethods: ['get_contract'],
      changeMethods: ['set_contract'],
      useLocalViewExecution: false,
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
    blockHeight: number,
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
          block_height: blockHeight,
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
