import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AddResult, IPFSEntry } from 'ipfs-core-types/src/root';
import { IPFSHTTPClient, create, globSource } from 'ipfs-http-client';

@Injectable()
export class IpfsService {
  private readonly quickNodeApiUrl =
    'https://api.quicknode.com/ipfs/rest/v1/pinning';
  private readonly quickNodeApiKey = process.env.QUICKNODE_API_KEY;
  private readonly ipfsHost = process.env.IPFS_HOST;
  private readonly ipfsPort = process.env.IPFS_PORT;
  private readonly swarmPort = process.env.SWARM_PORT;

  private readonly client: IPFSHTTPClient;
  private readonly logger = new Logger(IpfsService.name);

  constructor() {
    const ipfsUrl = `http://${this.ipfsHost}:${this.ipfsPort}`;

    this.client = create({ url: ipfsUrl });
    this.logger.log(`IPFS client created with URL: ${ipfsUrl}`);
  }

  async pinToQuickNode(cid: string, name: string): Promise<any> {
    const origins = [
      `/ip4/${this.ipfsHost}/tcp/${this.swarmPort}/p2p/SourcePeerId`,
      `/ip4/${this.ipfsHost}/udp/${this.swarmPort}/quic/p2p/SourcePeerId`,
    ];

    const data = {
      cid: cid,
      name: name,
      origins: origins,
    };

    this.logger.log('Sending pin request to QuickNode');

    const response = await axios.post(this.quickNodeApiUrl, data, {
      headers: {
        'x-api-key': this.quickNodeApiKey,
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`Pinning response: ${JSON.stringify(response.data)}`);

    return response.data;
  }

  async add(data: Buffer): Promise<AddResult> {
    this.logger.log('Adding data to IPFS');
    const result = await this.client.add(data);
    this.logger.log(`Data added to IPFS with CID: ${result.cid.toString()}`);
    return result;
  }

  async addFolder(path: string): Promise<string | undefined> {
    this.logger.log(`Adding folder to IPFS from path: ${path}`);
    const options = {
      pin: true,
      wrapWithDirectory: true,
    };

    let out: AddResult | null = null;
    for await (const file of this.client.addAll(
      globSource(path, '**/*'),
      options,
    )) {
      out = file;
    }

    if (out) {
      this.logger.log(`Folder added to IPFS with CID: ${out.cid.toString()}`);
      return out.cid.toString();
    } else {
      this.logger.warn('No files were added to IPFS');
      return undefined;
    }
  }

  async retrieve(cid: string): Promise<Buffer> {
    this.logger.log(`Retrieving data from IPFS with CID: ${cid}`);
    const stream = this.client.cat(cid);

    const edata: Uint8Array[] = [];
    for await (const chunk of stream) {
      edata.push(chunk);
    }

    this.logger.log(`Data retrieved from IPFS for CID: ${cid}`);
    return Buffer.concat(edata);
  }

  async listFilesAtPath(cid: string, path: string): Promise<IPFSEntry[]> {
    const fullPath = `${cid}/${path}`;
    this.logger.log(`Listing files at path: ${fullPath}`);
    const files: IPFSEntry[] = [];

    for await (const file of this.client.ls(fullPath)) {
      files.push(file);
    }

    if (files.length === 0) {
      this.logger.warn(`No files found at path: ${fullPath}`);
    }

    return files;
  }
}
