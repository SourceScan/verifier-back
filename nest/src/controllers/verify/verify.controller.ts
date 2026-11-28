import {
  Body,
  Controller,
  HttpException,
  Inject,
  Post,
  Res,
  UseFilters,
  Logger,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import {
  BuildInfo,
  ContractMetadataDto,
} from '../../dtos/contract-metadata.dto';
import { VerifyRustDto } from '../../dtos/verify.dto';
import { ExecException } from '../../exceptions/exec.exception';
import { ExecExceptionFilter } from '../../filters/exec-exception/exec-exception.filter';
import { ExecService } from '../../services/exec/exec.service';
import { GithubService } from '../../services/github/github.service';
import ContractData from '../../modules/near/interfaces/contract-data.interface';
import { RpcService } from '../../modules/near/services/rpc.service';
import { VerifierService } from '../../modules/near/services/verifier.service';
import { CompilerService } from '../../services/compiler/compiler.service';
import { IpfsService } from '../../services/ipfs/ipfs.service';
import { TempService } from '../../services/temp/temp.service';

/**
 * Reads a registry block height. The registry serializes its u64 as a JSON
 * number; a canonical decimal string (near_sdk's U64 form) is accepted too.
 * Returns null for anything else, including heights past the safe-integer range.
 */
function parseBlockHeight(value: unknown): number | null {
  const height =
    typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value)
      ? Number(value)
      : value;
  return Number.isSafeInteger(height) && (height as number) >= 0
    ? (height as number)
    : null;
}

@ApiTags('verify')
@ApiExtraModels(HttpException)
@Controller('verify')
export class VerifyController {
  private logger = new Logger(VerifyController.name);

  constructor(
    private readonly compilerService: CompilerService,
    private readonly githubService: GithubService,
    private readonly execService: ExecService,
    private readonly tempService: TempService,
    private readonly ipfsService: IpfsService,
    @Inject('MainnetVerifierService')
    private readonly mainnetVerifierService: VerifierService,
    @Inject('TestnetVerifierService')
    private readonly testnetVerifierService: VerifierService,
    @Inject('MainnetRpcService')
    private readonly mainnetRpcService: RpcService,
    @Inject('TestnetRpcService')
    private readonly testnetRpcService: RpcService,
  ) {}

  @Post('rust')
  @UseFilters(ExecExceptionFilter)
  @ApiOperation({
    summary: 'Verify Rust source code and add to contract with signer',
  })
  @ApiResponse({
    status: 200,
    description: 'Rust code compiled successfully',
    type: String,
  })
  @ApiResponse({
    status: 500,
    description: 'Execution exception occurred',
    type: ExecException,
  })
  async verifyRust(@Body() body: VerifyRustDto, @Res() res: Response) {
    const { networkId, accountId, blockId } = body;

    let verifierService: VerifierService;
    let rpcService: RpcService;
    if (networkId === 'mainnet') {
      verifierService = this.mainnetVerifierService;
      rpcService = this.mainnetRpcService;
    } else if (networkId === 'testnet') {
      verifierService = this.testnetVerifierService;
      rpcService = this.testnetRpcService;
    } else {
      throw new HttpException('Invalid network ID', 400);
    }

    // The existing record decides whether this request may replace it, so an
    // unreadable registry stops the request; only a null answer means no record.
    // It is read at the latest final block, not the verification block,
    // because the guards below compare against the record as it is now.
    let contractData: ContractData | null;
    try {
      contractData = await verifierService.getContract(accountId);
    } catch (error) {
      this.logger.error(
        `Registry read failed for ${accountId}: ${error.message}`,
      );
      return res.status(503).json({
        message: `Could not read the verifier registry for ${accountId}. Please retry later.`,
      });
    }

    // Pre-verification checks: Get contract metadata and validate repository accessibility
    let contractMetadata: ContractMetadataDto = null;
    let buildInfo: BuildInfo = null;
    // Every read after the metadata lookup is pinned to the block it came from.
    let blockHash: string;
    let blockHeight: number;
    let deployedHash: string;

    try {
      // Get contract metadata to check if source is accessible
      const contractMetadataResponse = await rpcService.callFunction(
        accountId,
        'contract_source_metadata',
        blockId,
      );

      contractMetadata = contractMetadataResponse.result;

      if (!contractMetadata || !contractMetadata.build_info) {
        return res
          .status(400)
          .json({ message: `No source metadata found for ${accountId}` });
      }

      buildInfo = contractMetadata.build_info;

      blockHash = contractMetadataResponse.block_hash;
      blockHeight = contractMetadataResponse.block_height;
      // blockId 0 has always meant the latest final block (callFunction treats it as unset)
      const requestedHeight = blockId || undefined;
      if (
        typeof blockHash !== 'string' ||
        !blockHash ||
        !Number.isSafeInteger(blockHeight) ||
        blockHeight < 0 ||
        (requestedHeight !== undefined && blockHeight !== requestedHeight)
      ) {
        throw new Error('Invalid block in metadata response');
      }

      const code = await rpcService.viewCode(accountId, blockHash);
      if (
        code.block_hash !== blockHash ||
        code.block_height !== blockHeight ||
        !('hash' in code) ||
        typeof code.hash !== 'string' ||
        !code.hash
      ) {
        throw new Error('Invalid code response for verification block');
      }
      deployedHash = code.hash;

      if (contractData) {
        // The record already holds the deployed code: nothing to build or write
        if (contractData.code_hash === deployedHash) {
          this.logger.log(
            `Code hash unchanged for ${accountId}: ${deployedHash} (already verified)`,
          );
          return res.status(400).json({ message: "Code hash didn't change" });
        }

        // set_contract replaces the record without comparing heights, so an
        // older block must not get that far
        const recordHeight = parseBlockHeight(contractData.block_height);
        if (recordHeight === null) {
          throw new Error('Invalid block height in registry record');
        }
        if (blockHeight < recordHeight) {
          this.logger.warn(
            `Rejected stale block for ${accountId}: block ${blockHeight} is older than the record at block ${recordHeight}`,
          );
          return res.status(409).json({
            message: `Block ${blockHeight} is older than the verified record for ${accountId} at block ${recordHeight}. Verify at block ${recordHeight} or later.`,
          });
        }
      }

      // Extract the repository URL and pinned commit SHA
      const { repoUrl, sha } = this.githubService.parseSourceCodeSnapshot(
        buildInfo.source_code_snapshot,
      );

      // Test repository accessibility by trying to clone it
      const tempFolder = await this.tempService.createFolder();
      try {
        await this.githubService.clone(tempFolder, repoUrl);
        const repoPath = this.githubService.getRepoPath(tempFolder, repoUrl);
        await this.githubService.checkout(repoPath, sha);
      } catch (error) {
        if (
          error.message.includes('Authentication failed') ||
          error.message.includes('could not read Username') ||
          error.message.includes('Repository not found') ||
          error.message.includes('remote: Repository not found') ||
          error.message.includes('fatal: repository')
        ) {
          return res.status(400).json({
            message: `Repository is not publicly accessible: ${repoUrl}. Contract verification requires public repositories.`,
          });
        }
        throw error; // Re-throw other errors
      } finally {
        await this.cleanupTempFolder(tempFolder);
      }

      // Check Docker image availability if using Docker build environment
      if (
        buildInfo.build_environment &&
        (buildInfo.build_environment.includes('sourcescan/cargo-near') ||
          buildInfo.build_environment.includes('docker'))
      ) {
        this.logger.log(
          `Docker build environment detected: ${buildInfo.build_environment}`,
        );

        // Extract Docker image name from build environment
        const dockerImage = buildInfo.build_environment;

        // Skip Docker image check since we're running in Docker-in-Docker environment
        // The image will be pulled during actual compilation if needed
        this.logger.log(
          `Docker build environment detected: ${dockerImage} - will be validated during compilation`,
        );
      }
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 400) {
        throw error; // Re-throw validation errors
      }
      this.logger.error(`Pre-verification checks failed: ${error.message}`);
      return res.status(500).json({
        message: `Pre-verification checks failed: ${error.message}`,
      });
    }

    // Use near-cli-rs to verify the contract
    try {
      const { stdout } = await this.compilerService.verifyContract(
        accountId,
        networkId,
        blockHash,
      );

      // Parse verification output
      const output = stdout.join('\n');
      this.logger.log(`Parsing verification output for ${accountId}`);

      // Check if verification was successful
      if (
        !output.includes(
          'The code obtained from the contract account ID and the code calculated from the repository are the same',
        )
      ) {
        this.logger.warn(`Verification failed for ${accountId}: code mismatch`);
        return res
          .status(400)
          .json({ message: 'Contract verification failed' });
      }

      // Extract checksum from output
      const checksumMatch = output.match(
        /Contract code hash:\s*([A-Za-z0-9]+)/,
      );
      const checksum = checksumMatch ? checksumMatch[1] : null;
      this.logger.log(`Extracted code hash for ${accountId}: ${checksum}`);

      if (!checksum) {
        this.logger.error(`Could not extract code hash for ${accountId}`);
        return res.status(400).json({
          message: 'Could not extract contract hash from verification output',
        });
      }

      // The rebuilt hash must be the code deployed at the verification block
      if (checksum !== deployedHash) {
        this.logger.warn(
          `Verification failed for ${accountId}: built ${checksum}, deployed ${deployedHash} at block ${blockHeight}`,
        );
        return res
          .status(400)
          .json({ message: 'Contract verification failed' });
      }

      // Backstop for the pre-build check: never rewrite an unchanged hash
      if (contractData && contractData.code_hash === checksum) {
        this.logger.log(
          `Code hash unchanged for ${accountId}: ${checksum} (already verified)`,
        );
        return res.status(400).json({ message: "Code hash didn't change" });
      }

      this.logger.log(
        `New verification for ${accountId}: old=${contractData?.code_hash || 'none'}, new=${checksum}`,
      );

      // Contract metadata and buildInfo already fetched in pre-verification checks

      // Extract the repository URL and pinned commit SHA
      const { repoUrl, sha } = this.githubService.parseSourceCodeSnapshot(
        buildInfo.source_code_snapshot,
      );

      let tempFolder: string = null;
      let cid = '';

      try {
        // Create a temporary folder to clone the repository for IPFS
        tempFolder = await this.tempService.createFolder();

        // Clone the repository and checkout the pinned commit SHA
        await this.githubService.clone(tempFolder, repoUrl);
        const repoPath = this.githubService.getRepoPath(tempFolder, repoUrl);
        await this.githubService.checkout(repoPath, sha);

        // Pin to IPFS
        this.logger.log(`Adding repository to IPFS for ${accountId}`);
        cid = await this.ipfsService.addFolder(repoPath);
        this.logger.log(`IPFS CID for ${accountId}: ${cid}`);
      } finally {
        await this.cleanupTempFolder(tempFolder);
      }

      // Store verification result
      this.logger.log(
        `Storing verification on-chain for ${accountId}: cid=${cid}, hash=${checksum}, block=${blockHeight}`,
      );
      await verifierService.setContract(
        accountId,
        cid,
        checksum,
        blockHeight,
        'rust',
      );

      this.logger.log(`Contract ${accountId} verified and stored successfully`);
      return res.status(200).json({
        message: 'Contract verified successfully',
        checksum: checksum,
      });
    } catch (error) {
      this.logger.error(`Verification error: ${error.message}`);
      return res.status(500).json({ message: error.message });
    }
  }

  private async cleanupTempFolder(tempFolder: string | null): Promise<void> {
    if (!tempFolder) {
      return;
    }

    try {
      await this.tempService.deleteFolder(tempFolder);
    } catch (cleanupError) {
      this.logger.error(
        `Failed to clean up ${tempFolder}: ${cleanupError.message}`,
      );
    }
  }
}
