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
    const files = await this.getFilesRecursively(folderPath);

    for (const file of files) {
      const relativePath = path.relative(folderPath, file);
      const content = await fs.readFile(file);
      form.append('file', content, {
        filename: relativePath,
        filepath: relativePath,
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
      this.logger.error(`Failed to list files at path: ${error.message}`);
      throw error;
    }
  }

  private async getFilesRecursively(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this.getFilesRecursively(fullPath)));
      } else if (entry.isSymbolicLink()) {
        // Check if symlink points to a directory or file
        try {
          const stat = await fs.stat(fullPath);
          if (stat.isDirectory()) {
            files.push(...(await this.getFilesRecursively(fullPath)));
          } else {
            files.push(fullPath);
          }
        } catch {
          // Skip broken symlinks
          this.logger.warn(`Skipping broken symlink: ${fullPath}`);
        }
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }
}
