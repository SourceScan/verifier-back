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

/** A call_function result is a JSON array of bytes; anything else is malformed. */
function isByteArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)
  );
}

/**
 * Reads a registry block height. The registry serializes its u64 as a JSON
 * number; a canonical decimal string (near_sdk's U64 form) is accepted too.
 * Returns null for anything else, including heights past the safe-integer range.
 */
function parseBlockHeight(value: unknown): number | null {
  const height =
    typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value)
      ? Number(value)
      : value;
  return Number.isSafeInteger(height) && (height as number) >= 0
    ? (height as number)
    : null;
}

/**
 * Checks the fields the verify guards rely on and returns the record with a
 * numeric block_height. JSON null is the registry's answer for no record.
 */
function parseRecord(value: unknown): ContractData | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('get_contract returned neither a record nor null');
  }
  const record = value as Record<string, unknown>;
  if (typeof record.code_hash !== 'string' || !record.code_hash) {
    throw new Error('Registry record has an invalid code_hash');
  }
  const blockHeight = parseBlockHeight(record.block_height);
  if (blockHeight === null) {
    throw new Error('Registry record has an invalid block_height');
  }
  return { ...(record as unknown as ContractData), block_height: blockHeight };
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

  /**
   * Reads the registry record for an account.
   *
   * Returns null only when the registry answers that no record exists
   * (`get_contract` returns `Option`, so that is JSON `null`). Throws when the
   * registry can't be read, its answer isn't a byte array of JSON, or the
   * record lacks a string code_hash or a valid block_height, because callers
   * must not mistake an outage or an unreadable record for a missing one.
   */
  async getContract(accountId: string): Promise<ContractData | null> {
    this.logger.log(`Fetching contract data for account ID: ${accountId}`);

    let contractData: ContractData | null;
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

      if (!isByteArray(result.result)) {
        throw new Error('get_contract result is not a byte array');
      }
      contractData = parseRecord(
        JSON.parse(Buffer.from(result.result).toString()),
      );
    } catch (error) {
      this.logger.error(
        `Error fetching contract data for account ID: ${accountId}`,
        error.stack,
      );
      throw new HttpException('Failed to read the verifier registry', 503);
    }

    this.logger.log(
      contractData === null
        ? `No registry record for account ID: ${accountId}`
        : `Contract data fetched successfully for account ID: ${accountId}`,
    );
    return contractData;
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
