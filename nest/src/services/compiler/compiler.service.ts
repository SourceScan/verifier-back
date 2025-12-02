import { Injectable, Logger } from '@nestjs/common';
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
    const command = `near contract verify deployed-at ${accountId} network-config ${networkId} now`;
    this.logger.log(`Starting contract verification: ${command}`);
    try {
      const { stdout } = await this.execService.executeCommand(command);
      this.logger.log(`Contract verification completed`);
      return { stdout };
    } catch (error) {
      this.logger.error(`Error verifying contract: ${error.message}`);
      throw error;
    }
  }
}
