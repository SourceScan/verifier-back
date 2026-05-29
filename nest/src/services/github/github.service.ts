import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { isValidGitRef } from '../../constants/validation.constants';
import { ExecService } from '../exec/exec.service';

const SCP_LIKE_GIT_URL_PATTERN =
  /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+:[A-Za-z0-9._~/-]+(?:\.git)?$/;

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

    const { repoUrl: rawRepoUrl, ref } = this.parseGitSnapshot(
      sourceCodeSnapshot.slice('git+'.length),
    );

    if (!ref || !isValidGitRef(ref)) {
      throw new BadRequestException('Source snapshot must pin a safe git ref');
    }

    const repoUrl = this.validateRepoUrl(rawRepoUrl);
    return { repoUrl, sha: ref };
  }

  getRepoPath(tempFolder: string, repoUrl: string): string {
    const normalizedRepoUrl = this.validateRepoUrl(repoUrl);
    const repoPath = this.getRepoUrlPath(normalizedRepoUrl);
    const repoName = path.basename(repoPath).replace(/\.git$/, '');
    return path.join(tempFolder, repoName);
  }

  async checkout(repoPath: string, ref: string): Promise<void> {
    if (!isValidGitRef(ref)) {
      throw new BadRequestException('Git ref contains unsafe characters');
    }

    this.logger.log(`Starting checkout command for ${ref}`);
    try {
      await this.execService.executeFile(
        'git',
        ['-c', 'advice.detachedHead=false', 'checkout', '--detach', '--', ref],
        { cwd: repoPath },
      );
      this.logger.log(`Checkout completed successfully.`);
    } catch (error) {
      this.logger.error(`Error in checkout: ${error.message}`);
      throw error;
    }
  }

  private parseGitSnapshot(snapshot: string): {
    repoUrl: string;
    ref: string | null;
  } {
    try {
      const snapshotUrl = new URL(snapshot);
      const revRef = snapshotUrl.searchParams.get('rev');
      const hashRef = snapshotUrl.hash
        ? decodeURIComponent(snapshotUrl.hash.slice(1))
        : null;

      if (revRef && hashRef && revRef !== hashRef) {
        throw new BadRequestException(
          'Source snapshot must not contain conflicting git refs',
        );
      }

      snapshotUrl.search = '';
      snapshotUrl.hash = '';

      return { repoUrl: snapshotUrl.toString(), ref: revRef ?? hashRef };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
    }

    return this.parseScpLikeGitSnapshot(snapshot);
  }

  private parseScpLikeGitSnapshot(snapshot: string): {
    repoUrl: string;
    ref: string;
  } {
    const revMarker = '?rev=';
    const revIndex = snapshot.indexOf(revMarker);
    const hashIndex = snapshot.indexOf('#');

    if (revIndex === -1 && hashIndex === -1) {
      throw new BadRequestException('Source snapshot must pin a git ref');
    }

    if (revIndex !== -1) {
      const repoUrl = snapshot.slice(0, revIndex);
      const refWithPossibleHash = snapshot.slice(revIndex + revMarker.length);
      const [revRef, hashRef] = refWithPossibleHash.split('#');

      if (hashRef && revRef !== hashRef) {
        throw new BadRequestException(
          'Source snapshot must not contain conflicting git refs',
        );
      }

      return { repoUrl, ref: revRef };
    }

    return {
      repoUrl: snapshot.slice(0, hashIndex),
      ref: snapshot.slice(hashIndex + 1),
    };
  }

  private validateRepoUrl(repoUrl: string): string {
    if (SCP_LIKE_GIT_URL_PATTERN.test(repoUrl)) {
      return repoUrl;
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(repoUrl);
    } catch {
      throw new BadRequestException('Repository URL must be a valid URL');
    }

    if (!['https:', 'ssh:', 'git:'].includes(parsedUrl.protocol)) {
      throw new BadRequestException(
        'Repository URL must use HTTPS, SSH, or git protocol',
      );
    }

    if (
      parsedUrl.password ||
      (parsedUrl.protocol === 'https:' && parsedUrl.username)
    ) {
      throw new BadRequestException('Repository URL must not contain secrets');
    }

    const normalizedPath = parsedUrl.pathname.replace(/\/$/, '');
    if (!/^\/[A-Za-z0-9._~/-]+(?:\.git)?$/.test(normalizedPath)) {
      throw new BadRequestException(
        'Repository URL must point to a git repository',
      );
    }

    parsedUrl.pathname = normalizedPath;
    parsedUrl.search = '';
    parsedUrl.hash = '';

    return parsedUrl.toString();
  }

  private getRepoUrlPath(repoUrl: string): string {
    if (SCP_LIKE_GIT_URL_PATTERN.test(repoUrl)) {
      return repoUrl.slice(repoUrl.indexOf(':') + 1);
    }

    return new URL(repoUrl).pathname;
  }
}
