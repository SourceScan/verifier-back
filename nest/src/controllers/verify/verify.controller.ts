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
import path from 'path';
import { BuildInfo, ContractMetadataDto } from 'src/dtos/contract-metadata.dto';
import { ExecExceptionFilter } from 'src/filters/exec-exception/exec-exception.filter';
import { GithubService } from 'src/services/github/github.service';
import { VerifyRustDto } from '../../dtos/verify.dto';
import { ExecException } from '../../exceptions/exec.exception';
import ContractData from '../../modules/near/interfaces/contract-data.interface';
import { RpcService } from '../../modules/near/services/rpc.service';
import { VerifierService } from '../../modules/near/services/verifier.service';
import { CompilerService } from '../../services/compiler/compiler.service';
import { IpfsService } from '../../services/ipfs/ipfs.service';
import { TempService } from '../../services/temp/temp.service';

@ApiTags('verify')
@ApiExtraModels(HttpException)
@Controller('verify')
export class VerifyController {
  private logger = new Logger(VerifyController.name);
  
  constructor(
    private readonly compilerService: CompilerService,
    private readonly githubService: GithubService,
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

    let contractData: ContractData = null;
    try {
      contractData = await verifierService.getContract(accountId);
    } catch (error) {
      // Contract not found in verifier, continue
    }

    // Use near-cli-rs to verify the contract
    try {
      const { stdout } = await this.compilerService.verifyContract(accountId, networkId);
      
      // Parse verification output
      const output = stdout.join('\n');
      
      // Check if verification was successful
      if (!output.includes('The code obtained from the contract account ID and the code calculated from the repository are the same')) {
        return res.status(400).json({ message: 'Contract verification failed' });
      }
      
      // Extract checksum from output
      const checksumMatch = output.match(/Contract code hash:\s*([A-Za-z0-9]+)/);
      const checksum = checksumMatch ? checksumMatch[1] : null;
      
      if (!checksum) {
        return res.status(400).json({ message: 'Could not extract contract hash from verification output' });
      }
      
      // Check if the code hash is the same as the one in the verifier contract
      if (contractData && contractData.code_hash === checksum) {
        return res.status(400).json({ message: "Code hash didn't change" });
      }
      
      // Get the actual block height from the contract code query
      const codeResponse = await rpcService.viewCode(accountId, blockId);
      const blockHeight = (codeResponse as any).block_height;
      
      // Get contract metadata for IPFS pinning
      const contractMetadataResponse = await rpcService.callFunction(
        accountId,
        'contract_source_metadata',
        blockId,
      );

      const contractMetadata: ContractMetadataDto =
        contractMetadataResponse.result;
      
      if (!contractMetadata || !contractMetadata.build_info) {
        return res
          .status(400)
          .json({ message: `No source metadata found for ${accountId}` });
      }

      const buildInfo: BuildInfo = contractMetadata.build_info;
      
      // Extract the repository URL and the commit hash
      const { repoUrl, sha } = this.githubService.parseSourceCodeSnapshot(
        buildInfo.source_code_snapshot,
      );
      
      // Create a temporary folder to clone the repository for IPFS
      const tempFolder = await this.tempService.createFolder();
      
      // Clone the repository and checkout the commit
      await this.githubService.clone(tempFolder, repoUrl);
      const repoPath = this.githubService.getRepoPath(tempFolder, repoUrl);
      await this.githubService.checkout(repoPath, sha);
      
      // Pin to IPFS
      let cid = '';
      cid = await this.ipfsService.addFolder(repoPath);
      
      // Pin the folder to IPFS provider
      try {
        await this.ipfsService.pinToQuickNode(cid, `${accountId}-${blockId || 'latest'}`);
      } catch (error) {
        if (
          error.response?.status !== 409 ||
          error.response?.data?.message !== 'Object with cid already exists'
        ) {
          throw new HttpException(
            error.message || 'IPFS pinning failed',
            error.statusCode || 500,
          );
        }
      }

      // Clean up temp folder
      await this.tempService.deleteFolder(tempFolder);

      // Store verification result
      await verifierService.setContract(
        accountId,
        cid,
        checksum,
        blockHeight,
        'rust',
      );

      return res
        .status(200)
        .json({ message: 'Contract verified successfully', checksum: checksum });
    } catch (error) {
      this.logger.error(`Verification error: ${error.message}`);
      return res.status(500).json({ message: error.message });
    }
  }
}