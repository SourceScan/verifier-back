import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  isValidNearAccountId,
  isValidNetworkId,
} from '../../constants/validation.constants';
import { ExecService } from '../exec/exec.service';

@Injectable()
export class CompilerService {
  private readonly logger = new Logger(CompilerService.name);

  constructor(private execService: ExecService) {}

  /**
   * Verify a deployed contract using near-cli-rs
   */
  async verifyContract(
    accountId: string,
    networkId: string,
  ): Promise<{ stdout: string[] }> {
    if (!isValidNearAccountId(accountId)) {
      throw new BadRequestException('Invalid NEAR account ID');
    }

    if (!isValidNetworkId(networkId)) {
      throw new BadRequestException('Invalid network ID');
    }

    this.logger.log(
      `Starting contract verification for ${accountId} on ${networkId}`,
    );
    try {
      const { stdout } = await this.execService.executeFile('near', [
        'contract',
        'verify',
        'deployed-at',
        accountId,
        'network-config',
        networkId,
        'now',
      ]);
      this.logger.log(`Contract verification completed`);
      return { stdout };
    } catch (error) {
      this.logger.error(`Error verifying contract: ${error.message}`);
      throw error;
    }
  }
}
