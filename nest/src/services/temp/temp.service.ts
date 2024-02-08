import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as bs58 from 'bs58';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { rimraf } from 'rimraf';
import { RandomService } from '../random/random.service';

@Injectable()
export class TempService {
  private readonly logger = new Logger(TempService.name);
  private readonly folderCreationTimes: Map<string, Date> = new Map();

  public constructor(private readonly randomService: RandomService) {}

  private readonly basePath: string = '/tmp';
  private readonly validExtensions: string[] = ['.ts', '.rs', '.toml', '.json'];

  async createFolder(): Promise<string> {
    const folder = path.join(this.basePath, this.randomService.genHexStr(12));
    await fs.mkdir(folder);
    this.folderCreationTimes.set(folder, new Date());
    this.logger.log(`Done creating ${folder}`);
    return folder;
  }

  async appendFolder(folderPath: string): Promise<string> {
    const folder = path.join(folderPath, this.randomService.genHexStr(12));
    await fs.mkdir(folder);
    this.logger.log(`Done creating ${folder}`);
    return folder;
  }

  async checkFolder(folderPath: string): Promise<boolean> {
    try {
      await fs.access(folderPath, fs.constants.F_OK);
      return true;
    } catch (err) {
      this.logger.error(`Error accessing ${folderPath}: ${err.message}`);
      return false;
    }
  }

  async getMatchingFiles(sourcePath: string, dir: string): Promise<string[]> {
    try {
      const matches: string[] = [];
      for await (const filePath of this.getFiles(dir)) {
        if (this.validExtensions.some((ext) => filePath.endsWith(ext))) {
          matches.push(filePath.replace(`${sourcePath}/`, ''));
        }
      }
      this.logger.log(`Found matches in ${dir}: ${JSON.stringify(matches)}`);
      return matches;
    } catch (error) {
      this.logger.error(`Error reading directory ${dir}: ${error.message}`);
      return [];
    }
  }

  async deleteFolder(folder: string): Promise<void> {
    try {
      const exists = await this.checkFolder(folder);
      if (!exists) {
        throw new HttpException(`Folder ${folder} does not exist`, 404);
      }
      await rimraf(folder);
      this.logger.log(`Done deleting ${folder}`);
    } catch (error) {
      this.logger.error(`Error deleting folder ${folder}: ${error.message}`);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCleanup() {
    for (const [folder, creationTime] of this.folderCreationTimes) {
      if (
        new Date().getTime() - creationTime.getTime() >
        6000 * parseInt(process.env.JWT_EXPIRATION)
      ) {
        try {
          const exists = await this.checkFolder(folder);
          if (exists) {
            await this.deleteFolder(folder);
          }

          this.folderCreationTimes.delete(folder);
        } catch (error) {
          this.logger.error(
            `Error deleting folder ${folder}: ${error.message}`,
          );
        }
      }
    }
  }

  async readRustWasmFile(
    sourcePath: string,
  ): Promise<{ wasmBase64: string; checksum: string }> {
    try {
      const releasePath = path.join(sourcePath, 'release');
      // Delete the release folder if it exists
      if (await this.checkFolder(releasePath)) {
        await this.deleteFolder(releasePath);
      }

      const dirContent = await fs.readdir(
        path.join(sourcePath, 'target', 'near'),
      );
      const wasmFiles = dirContent.filter((file) => file.endsWith('.wasm'));

      if (wasmFiles.length === 0) {
        throw new Error('No WASM files found');
      }

      const wasmFilePath = path.join(
        sourcePath,
        'target',
        'near',
        wasmFiles[0],
      );
      const wasmFileData = await fs.readFile(wasmFilePath);
      const wasmBase64 = wasmFileData.toString('base64');

      // Calculate SHA-256 hash
      const hash = crypto.createHash('sha256');
      hash.update(wasmFileData);
      const checksum = bs58.encode(hash.digest());

      // Delete the wasm32-unknown-unknown folder
      await this.deleteFolder(path.join(sourcePath, 'target'));

      return { wasmBase64, checksum };
    } catch (error) {
      this.logger.error(`Error in readWasmFile: ${error.message}`);
      throw error;
    }
  }

  private async *getFiles(dir: string): AsyncGenerator<string> {
    try {
      const dirents = await fs.readdir(dir, { withFileTypes: true });
      for (const dirent of dirents) {
        const res = path.resolve(dir, dirent.name);
        if (dirent.isDirectory()) {
          yield* this.getFiles(res);
        } else {
          yield res;
        }
      }
    } catch (error) {
      this.logger.error(
        `Error getting files from directory ${dir}: ${error.message}`,
      );
    }
  }
}
