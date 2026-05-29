import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { isValidCommitSha } from '../../constants/validation.constants';
import { ExecService } from '../exec/exec.service';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(private execService: ExecService) {}

  async clone(sourcePath: string, repo: string): Promise<void> {
    const repoUrl = this.validateRepoUrl(repo);
    this.logger.log(`Starting clone command for ${repoUrl}`);
    try {
      await this.execService.executeFile('git', ['clone', '--', repoUrl], {
        cwd: sourcePath,
      });
      this.logger.log(`Repository cloned successfully.`);
    } catch (error) {
      this.logger.error(`Error in clone: ${error.message}`);
      throw error;
    }
  }

  parseSourceCodeSnapshot(sourceCodeSnapshot: string): {
    repoUrl: string;
    sha: string;
  } {
    if (!sourceCodeSnapshot?.startsWith('git+')) {
      throw new BadRequestException('Source snapshot must use git+ URL format');
    }

    let snapshotUrl: URL;

    try {
      snapshotUrl = new URL(sourceCodeSnapshot.slice('git+'.length));
    } catch {
      throw new BadRequestException('Source snapshot must contain a valid URL');
    }
    const revSha = snapshotUrl.searchParams.get('rev');
    const hashSha = snapshotUrl.hash ? snapshotUrl.hash.slice(1) : null;
    if (revSha && hashSha && revSha !== hashSha) {
      throw new BadRequestException(
        'Source snapshot must not contain conflicting commit SHAs',
      );
    }

    const sha = revSha ?? hashSha;

    if (!sha || !isValidCommitSha(sha)) {
      throw new BadRequestException(
        'Source snapshot must pin a full 40-character commit SHA',
      );
    }

    snapshotUrl.search = '';
    snapshotUrl.hash = '';

    const repoUrl = this.validateRepoUrl(snapshotUrl.toString());
    return { repoUrl, sha };
  }

  getRepoPath(tempFolder: string, repoUrl: string): string {
    const parsedUrl = new URL(this.validateRepoUrl(repoUrl));
    const repoName = path.basename(parsedUrl.pathname).replace(/\.git$/, '');
    return path.join(tempFolder, repoName);
  }

  async checkout(repoPath: string, sha: string): Promise<void> {
    if (!isValidCommitSha(sha)) {
      throw new BadRequestException('Commit SHA must be 40 hex characters');
    }

    this.logger.log(`Starting checkout command for ${sha}`);
    try {
      await this.execService.executeFile(
        'git',
        ['-c', 'advice.detachedHead=false', 'checkout', '--detach', sha],
        { cwd: repoPath },
      );
      this.logger.log(`Checkout completed successfully.`);
    } catch (error) {
      this.logger.error(`Error in checkout: ${error.message}`);
      throw error;
    }
  }

  private validateRepoUrl(repoUrl: string): string {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(repoUrl);
    } catch {
      throw new BadRequestException('Repository URL must be a valid URL');
    }

    if (parsedUrl.protocol !== 'https:') {
      throw new BadRequestException('Repository URL must use HTTPS');
    }

    if (parsedUrl.username || parsedUrl.password) {
      throw new BadRequestException('Repository URL must not contain secrets');
    }

    if (parsedUrl.hostname.toLowerCase() !== 'github.com') {
      throw new BadRequestException('Only github.com repositories are allowed');
    }

    const normalizedPath = parsedUrl.pathname.replace(/\/$/, '');
    if (
      !/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(normalizedPath)
    ) {
      throw new BadRequestException(
        'Repository URL must point to a GitHub repo',
      );
    }

    parsedUrl.pathname = normalizedPath;
    parsedUrl.search = '';
    parsedUrl.hash = '';

    return parsedUrl.toString();
  }
}
