import { Injectable, Logger } from '@nestjs/common';
import { ExecService } from '../exec/exec.service';
import { BuildInfo } from '../../dtos/contract-metadata.dto';

@Injectable()
export class CompilerService {
  private readonly logger = new Logger(CompilerService.name);
  private readonly scriptsPath = '/app/scripts/compiler';

  constructor(private execService: ExecService) {}

  async compileRust(
    sourcePath: string,
    buildCommand: string,
    variant?: string,
  ): Promise<{ stdout: string[] }> {
    // Add variant flag if specified and not already in command
    let finalCommand = buildCommand;
    if (variant && !buildCommand.includes('--variant')) {
      finalCommand += ` --variant ${variant}`;
    }
    
    const command = `sh ${this.scriptsPath}/rust.sh ${sourcePath} "${finalCommand}"`;
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

  /**
   * Compile Rust code using Docker for reproducible builds
   * Uses the cargo-near Docker image for consistent builds
   */
  async compileRustDocker(
    sourcePath: string,
    buildInfo: BuildInfo,
  ): Promise<{ stdout: string[] }> {
    // Extract image from build_environment
    const imageInfo = this.parseDockerImage(buildInfo.build_environment);
    
    // Build the build command with proper array handling
    let buildCommandArray = buildInfo.build_command || ['cargo', 'near', 'build'];
    
    // Add variant flag if specified and not already in command
    if (buildInfo.variant && !buildCommandArray.includes('--variant')) {
      buildCommandArray = [...buildCommandArray, '--variant', buildInfo.variant];
    }
    
    // Get the repository root directory
    // sourcePath is the full path to the contract directory (e.g., /tmp/xxx/repo/contract)
    // We need to get the repo root by removing the contract_path from the end
    let repoRoot = sourcePath;
    if (buildInfo.contract_path && buildInfo.contract_path !== '') {
      // Remove the contract path from the end to get repo root
      const contractPathSuffix = '/' + buildInfo.contract_path;
      if (sourcePath.endsWith(contractPathSuffix)) {
        repoRoot = sourcePath.substring(0, sourcePath.length - contractPathSuffix.length);
      }
    }
    
    // Make the directory writable for the Docker container user (UID 1000)
    // The cargo-near image runs as user 'near' with UID 1000
    await this.execService.executeCommand(`chmod -R 777 ${repoRoot}`);
    
    // Build the Docker command
    // Mount the repository root and set working directory to the contract path
    const dockerCommand = [
      'docker', 'run', '--rm',
      '-v', `${repoRoot}:/workspace`,
      '-w', `/workspace/${buildInfo.contract_path}`,
      imageInfo,
      ...buildCommandArray,
    ].join(' ');
    
    this.logger.log(`Starting Docker Rust compilation: ${dockerCommand}`);
    try {
      const { stdout } = await this.execService.executeCommand(dockerCommand);
      this.logger.log(`Docker Rust compilation completed`);
      // Log output for debugging
      if (stdout && stdout.length > 0) {
        const outputLines = stdout.join('\n');
        // Log last few lines which typically contain the binary path
        const lines = outputLines.split('\n');
        const lastLines = lines.slice(-10).join('\n');
        this.logger.log(`Docker compilation output (last 10 lines): ${lastLines}`);
      }
      return { stdout };
    } catch (error) {
      this.logger.error(`Error compiling Rust with Docker: ${error.message}`);
      throw error;
    }
  }

  private parseDockerImage(buildEnvironment: string): string {
    // Extract Docker image from build_environment
    // Supports formats:
    // - "sourcescan/cargo-near:0.16.1-rust-1.86.0"
    // - "sourcescan/cargo-near:0.16.1-rust-1.86.0@sha256:abc123..."
    // - "docker:sourcescan/cargo-near:0.16.1-rust-1.86.0"
    const dockerImageMatch = buildEnvironment.match(/sourcescan\/cargo-near:[^\s]+/);
    if (dockerImageMatch) {
      return dockerImageMatch[0];
    }
    // If no match, return as-is (might be a full Docker image spec)
    return buildEnvironment;
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
}
