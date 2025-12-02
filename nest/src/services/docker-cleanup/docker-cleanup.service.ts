import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as cp from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(cp.exec);

@Injectable()
export class DockerCleanupService {
  private readonly logger = new Logger(DockerCleanupService.name);

  /**
   * Run daily at 3 AM - clean build cache older than 7 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanBuildCache() {
    this.logger.log('Starting daily build cache cleanup...');

    try {
      // Remove build cache older than 7 days, keep at least 2GB for faster rebuilds
      const { stdout } = await execAsync(
        'docker builder prune --filter "until=168h" --keep-storage 2GB -f 2>&1',
      );

      const reclaimedMatch = stdout.match(/Total reclaimed space:\s*(.+)/i);
      const reclaimed = reclaimedMatch ? reclaimedMatch[1].trim() : '0B';

      this.logger.log(`Build cache cleanup complete. Reclaimed: ${reclaimed}`);
    } catch (error) {
      this.logger.error(`Build cache cleanup failed: ${error.message}`);
    }
  }

  /**
   * Run weekly on Sunday at 4 AM - clean orphan volumes and dangling images
   */
  @Cron(CronExpression.EVERY_WEEK)
  async cleanOrphanResources() {
    this.logger.log('Starting weekly orphan resources cleanup...');

    try {
      // Remove orphan volumes (those with 0 links)
      const volumeResult = await execAsync('docker volume prune -f 2>&1');
      const volumeMatch = volumeResult.stdout.match(
        /Total reclaimed space:\s*(.+)/i,
      );
      const volumeReclaimed = volumeMatch ? volumeMatch[1].trim() : '0B';

      this.logger.log(`Volume cleanup complete. Reclaimed: ${volumeReclaimed}`);
    } catch (error) {
      this.logger.error(`Volume cleanup failed: ${error.message}`);
    }

    try {
      // Remove dangling images (untagged)
      const imageResult = await execAsync('docker image prune -f 2>&1');
      const imageMatch = imageResult.stdout.match(
        /Total reclaimed space:\s*(.+)/i,
      );
      const imageReclaimed = imageMatch ? imageMatch[1].trim() : '0B';

      this.logger.log(`Image cleanup complete. Reclaimed: ${imageReclaimed}`);
    } catch (error) {
      this.logger.error(`Image cleanup failed: ${error.message}`);
    }
  }

  /**
   * Run monthly on 1st at 5 AM - aggressive cleanup of all unused resources
   */
  @Cron('0 5 1 * *')
  async deepClean() {
    this.logger.log('Starting monthly deep cleanup...');

    try {
      // Remove all unused images (not just dangling), containers, networks
      // But NOT volumes (too risky for data loss)
      const { stdout } = await execAsync(
        'docker system prune -a --filter "until=720h" -f 2>&1',
      );

      const reclaimedMatch = stdout.match(/Total reclaimed space:\s*(.+)/i);
      const reclaimed = reclaimedMatch ? reclaimedMatch[1].trim() : '0B';

      this.logger.log(`Deep cleanup complete. Reclaimed: ${reclaimed}`);
    } catch (error) {
      this.logger.error(`Deep cleanup failed: ${error.message}`);
    }
  }

  /**
   * Manual cleanup - can be called programmatically if needed
   */
  async runManualCleanup(): Promise<{
    buildCache: string;
    volumes: string;
    images: string;
  }> {
    this.logger.log('Running manual cleanup...');

    const results = {
      buildCache: '0B',
      volumes: '0B',
      images: '0B',
    };

    try {
      const buildResult = await execAsync(
        'docker builder prune --filter "until=72h" -f 2>&1',
      );
      const buildMatch = buildResult.stdout.match(
        /Total reclaimed space:\s*(.+)/i,
      );
      results.buildCache = buildMatch ? buildMatch[1].trim() : '0B';
    } catch (error) {
      this.logger.error(`Build cache cleanup failed: ${error.message}`);
    }

    try {
      const volumeResult = await execAsync('docker volume prune -f 2>&1');
      const volumeMatch = volumeResult.stdout.match(
        /Total reclaimed space:\s*(.+)/i,
      );
      results.volumes = volumeMatch ? volumeMatch[1].trim() : '0B';
    } catch (error) {
      this.logger.error(`Volume cleanup failed: ${error.message}`);
    }

    try {
      const imageResult = await execAsync('docker image prune -f 2>&1');
      const imageMatch = imageResult.stdout.match(
        /Total reclaimed space:\s*(.+)/i,
      );
      results.images = imageMatch ? imageMatch[1].trim() : '0B';
    } catch (error) {
      this.logger.error(`Image cleanup failed: ${error.message}`);
    }

    this.logger.log(
      `Manual cleanup complete. Build cache: ${results.buildCache}, Volumes: ${results.volumes}, Images: ${results.images}`,
    );

    return results;
  }
}
