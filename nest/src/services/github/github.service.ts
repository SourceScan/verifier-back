import { Injectable, Logger } from '@nestjs/common';
import GithubData from '../../modules/near/interfaces/github-data.interface';
import { ExecService } from '../exec/exec.service';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly scriptsPath = '/app/scripts/github';

  constructor(private execService: ExecService) {}

  async clone(sourcePath: string, repo: string): Promise<void> {
    const command = `sh ${this.scriptsPath}/clone.sh ${sourcePath} ${repo}`;
    this.logger.log(`Starting clone command: ${command}`);
    try {
      await this.execService.executeCommand(command);
      this.logger.log(`Repository cloned successfully.`);
    } catch (error) {
      this.logger.error(`Error in clone: ${error.message}`);
      throw error;
    }
  }

  async getRepoInfo(repoUrl: string, sha): Promise<GithubData> {
    const urlSplit = repoUrl.split('/');

    const repo = urlSplit.pop();
    const owner = urlSplit.pop();

    return { owner, repo, sha };
  }

  parseSourceCodeSnapshot(sourceCodeSnapshot: string): {
    repoUrl: string;
    sha: string;
  } {
    // Remove the 'git+' prefix
    const repoInfo = sourceCodeSnapshot.replace('git+', '');
    // Extract the repository URL and the commit hash
    const [repoUrl, sha] = repoInfo.split('?rev=');
    return { repoUrl, sha };
  }

  getRepoPath(tempFolder: string, repoUrl: string): string {
    return `${tempFolder}/${repoUrl.split('/').pop().replace('.git', '')}`;
  }

  async checkout(repoPath: string, sha: string): Promise<void> {
    const command = `sh ${this.scriptsPath}/checkout.sh ${repoPath} ${sha}`;
    this.logger.log(`Starting checkout command: ${command}`);
    try {
      await this.execService.executeCommand(command);
      this.logger.log(`Checkout completed successfully.`);
    } catch (error) {
      this.logger.error(`Error in checkout: ${error.message}`);
      throw error;
    }
  }
}
