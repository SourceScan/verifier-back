import { Injectable, Logger } from '@nestjs/common';
import { ExecService } from '../exec/exec.service';

@Injectable()
export class CompilerService {
  private readonly logger = new Logger(CompilerService.name);
  private readonly scriptsPath = '/app/scripts/compiler';

  constructor(private execService: ExecService) {}

  async compileRust(
    sourcePath: string,
    destPath: string,
  ): Promise<{ stdout: string }> {
    const command = `docker exec contract-builder sh ${this.scriptsPath}/rust.sh ${sourcePath} ${destPath}`;
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

  async compileTypeScript(sourcePath: string): Promise<{ stdout: string }> {
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
}
