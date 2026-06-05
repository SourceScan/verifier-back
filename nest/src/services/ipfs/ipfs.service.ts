import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface IpfsFileEntry {
  Name: string;
  Hash: string;
  Size: number;
  Type: number; // 1 = directory, 2 = file
}

interface IpfsUploadFile {
  sourcePath: string;
  relativePath: string;
}

@Injectable()
export class IpfsService {
  private readonly ipfsHost = process.env.IPFS_HOST;
  private readonly ipfsPort = process.env.IPFS_PORT;

  private readonly ipfsApiUrl: string;
  private readonly logger = new Logger(IpfsService.name);

  constructor() {
    this.ipfsApiUrl = `http://${this.ipfsHost}:${this.ipfsPort}/api/v0`;
    this.logger.log(`IPFS API URL: ${this.ipfsApiUrl}`);
  }

  async addFolder(folderPath: string): Promise<string | undefined> {
    this.logger.log(`Adding folder to IPFS from path: ${folderPath}`);

    const form = new FormData();
    const rootPath = await fs.realpath(folderPath);
    const files = await this.getFilesRecursively(rootPath);

    for (const file of files) {
      const content = await fs.readFile(file.sourcePath);
      form.append('file', content, {
        filename: file.relativePath,
        filepath: file.relativePath,
      });
    }

    try {
      const response = await axios.post(
        `${this.ipfsApiUrl}/add?wrap-with-directory=true&pin=true`,
        form,
        {
          headers: form.getHeaders(),
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        },
      );

      // IPFS returns newline-delimited JSON, last line is the root directory
      const lines = response.data
        .toString()
        .trim()
        .split('\n')
        .filter((line: string) => line);
      const results = lines.map((line: string) => JSON.parse(line));

      // The last entry with empty name is the wrapper directory
      const rootDir = results.find(
        (r: { Name: string; Hash: string }) => r.Name === '',
      );

      if (rootDir) {
        this.logger.log(`Folder added to IPFS with CID: ${rootDir.Hash}`);
        return rootDir.Hash;
      }

      this.logger.warn('No root directory found in IPFS response');
      return undefined;
    } catch (error) {
      this.logger.error(`Failed to add folder to IPFS: ${error.message}`);
      throw error;
    }
  }

  async listFilesAtPath(
    cid: string,
    subPath: string,
  ): Promise<IpfsFileEntry[]> {
    const fullPath = subPath ? `${cid}/${subPath}` : cid;
    this.logger.log(`Listing files at path: ${fullPath}`);

    try {
      const response = await axios.post(
        `${this.ipfsApiUrl}/ls?arg=${encodeURIComponent(fullPath)}`,
      );

      const objects = response.data?.Objects;
      if (!objects || objects.length === 0) {
        this.logger.warn(`No files found at path: ${fullPath}`);
        return [];
      }

      const links = objects[0]?.Links || [];
      return links.map(
        (link: { Name: string; Hash: string; Size: number; Type: number }) => ({
          Name: link.Name,
          Hash: link.Hash,
          Size: link.Size,
          Type: link.Type,
        }),
      );
    } catch (error) {
      // IPFS returns 500 when path doesn't exist - return empty array instead
      if (error.response?.data?.Message?.includes('no link named')) {
        this.logger.warn(`Path not found: ${fullPath}`);
        return [];
      }
      this.logger.error(`Failed to list files at path: ${error.message}`);
      throw error;
    }
  }

  private async getFilesRecursively(
    dir: string,
    rootPath = dir,
    relativeDir = '',
    ancestorDirs = new Set<string>([rootPath]),
  ): Promise<IpfsUploadFile[]> {
    const files: IpfsUploadFile[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = relativeDir
        ? path.join(relativeDir, entry.name)
        : entry.name;
      const stats = await fs.lstat(fullPath);

      if (stats.isSymbolicLink()) {
        await this.addSymbolicLinkTarget(
          files,
          fullPath,
          relativePath,
          rootPath,
          ancestorDirs,
        );
        continue;
      }

      if (stats.isDirectory()) {
        const realPath = await fs.realpath(fullPath);
        if (!this.isPathInsideRoot(rootPath, realPath)) {
          this.logger.warn(`Skipping directory outside IPFS root: ${fullPath}`);
          continue;
        }

        if (ancestorDirs.has(realPath)) {
          this.logger.warn(
            `Skipping recursive directory while adding to IPFS: ${fullPath}`,
          );
          continue;
        }

        files.push(
          ...(await this.getFilesRecursively(
            realPath,
            rootPath,
            relativePath,
            new Set([...ancestorDirs, realPath]),
          )),
        );
        continue;
      }

      if (!stats.isFile()) {
        this.logger.warn(
          `Skipping non-regular file while adding to IPFS: ${fullPath}`,
        );
        continue;
      }

      const realPath = await fs.realpath(fullPath);
      if (!this.isPathInsideRoot(rootPath, realPath)) {
        this.logger.warn(`Skipping file outside IPFS root: ${fullPath}`);
        continue;
      }

      files.push({ sourcePath: realPath, relativePath });
    }

    return files;
  }

  private async addSymbolicLinkTarget(
    files: IpfsUploadFile[],
    symlinkPath: string,
    relativePath: string,
    rootPath: string,
    ancestorDirs: Set<string>,
  ): Promise<void> {
    let realPath: string;
    try {
      realPath = await fs.realpath(symlinkPath);
    } catch {
      this.logger.warn(`Skipping broken symlink: ${symlinkPath}`);
      return;
    }

    if (!this.isPathInsideRoot(rootPath, realPath)) {
      this.logger.warn(
        `Skipping symlink outside IPFS root while adding to IPFS: ${symlinkPath}`,
      );
      return;
    }

    const stats = await fs.stat(realPath);
    if (stats.isDirectory()) {
      if (ancestorDirs.has(realPath)) {
        this.logger.warn(
          `Skipping recursive symlink while adding to IPFS: ${symlinkPath}`,
        );
        return;
      }

      files.push(
        ...(await this.getFilesRecursively(
          realPath,
          rootPath,
          relativePath,
          new Set([...ancestorDirs, realPath]),
        )),
      );
      return;
    }

    if (!stats.isFile()) {
      this.logger.warn(
        `Skipping symlink to non-regular file while adding to IPFS: ${symlinkPath}`,
      );
      return;
    }

    files.push({ sourcePath: realPath, relativePath });
  }

  private isPathInsideRoot(rootPath: string, candidatePath: string): boolean {
    const relativePath = path.relative(rootPath, candidatePath);
    return (
      relativePath === '' ||
      (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
    );
  }
}
