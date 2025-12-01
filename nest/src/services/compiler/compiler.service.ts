import { Injectable, Logger } from '@nestjs/common';
import { ExecService } from '../exec/exec.service';

@Injectable()
export class CompilerService {
  private readonly logger = new Logger(CompilerService.name);
  private readonly scriptsPath = '/app/scripts/compiler';

  constructor(private execService: ExecService) {}

  async compileRust(
    sourcePath: string,
    buildCommand: string,
  ): Promise<{ stdout: string[] }> {
    const command = `sh ${this.scriptsPath}/rust.sh ${sourcePath} "${buildCommand}"`;
    this.logger.log(`Starting Rust compilation with command: ${command}`);
    try {
      const { stdout } = await this.execService.executeCommand(command);
      this.logger.log(`Rust compilation completed. Output: ${stdout}`);
      return { stdout };
    } catch (error) {
      this.logger.error(`Error compiling Rust: ${error.message}`);
      throw error;
    }
  }

  async compileTypeScript(sourcePath: string): Promise<{ stdout: string[] }> {
    const command = `sh ${this.scriptsPath}/ts.sh ${sourcePath}`;
    this.logger.log(`Starting TypeScript compilation with command: ${command}`);
    try {
      const { stdout } = await this.execService.executeCommand(command);
      this.logger.log(`TypeScript compilation completed. Output: ${stdout}`);
      return { stdout };
    } catch (error) {
      this.logger.error(`Error compiling TypeScript: ${error.message}`);
      throw error;
    }
  }

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
