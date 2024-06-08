import {
  Body,
  Controller,
  HttpException,
  Inject,
  Post,
  Res,
  UseFilters,
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
import { BuilderInfoService } from '../../services/builder-info/builder-info.service';
import { CompilerService } from '../../services/compiler/compiler.service';
import { IpfsService } from '../../services/ipfs/ipfs.service';
import { TempService } from '../../services/temp/temp.service';

@ApiTags('verify')
@ApiExtraModels(HttpException)
@Controller('verify')
export class VerifyController {
  constructor(
    private readonly compilerService: CompilerService,
    private readonly githubService: GithubService,
    private readonly tempService: TempService,
    private readonly ipfsService: IpfsService,
    private readonly builderInfoService: BuilderInfoService,
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
    const { networkId, accountId, uploadToIpfs, blockId } = body;

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

    // Get the contract data from the verifier contract
    const contractData: ContractData = await verifierService.getContract(
      accountId,
      blockId,
    );

    // Get the contract code from the RPC node
    const rpcResponse: any = await rpcService.viewCode(accountId, blockId);
    if (!rpcResponse) {
      return res
        .status(400)
        .json({ message: 'Error while calling rpc method' });
    }

    // Check if the code hash is the same as the one in the verifier contract
    if (contractData && contractData.code_hash === rpcResponse.hash) {
      return res.status(400).json({ message: "Code hash didn't change" });
    }

    // Get the contract metadata with contract_source_metadata method
    const contractMetadataResponse = await rpcService.callFunction(
      accountId,
      'contract_source_metadata',
      blockId,
    );

    const contractMetadata: ContractMetadataDto =
      contractMetadataResponse.result;
    // Check if the contract metadata is available
    if (!contractMetadata) {
      return res
        .status(400)
        .json({ message: `No source metadata found for ${accountId}` });
    }

    const buildInfo: BuildInfo = contractMetadata.build_info;
    // Check if the build info is available
    if (!buildInfo) {
      return res
        .status(400)
        .json({ message: `No build info found for ${accountId}` });
    }

    // Create a temporary folder to clone the repository
    const tempFolder = await this.tempService.createFolder();

    // Extract the repository URL and the commit hash
    const { repoUrl, sha } = this.githubService.parseSourceCodeSnapshot(
      buildInfo.source_code_snapshot,
    );
    // Clone the repository and checkout the commit
    await this.githubService.clone(tempFolder, repoUrl);
    // Checkout the commit in repo
    const repoPath = this.githubService.getRepoPath(tempFolder, repoUrl);
    await this.githubService.checkout(repoPath, sha);

    // TODO: move to temp service
    const entryPath = path.join(repoPath, buildInfo.contract_path);
    // Compile the Rust code
    const { stdout } = await this.compilerService.compileRust(
      entryPath,
      // TODO: get command from buildInfo without args check whitelist
      `cargo near build`,
    );

    // TODO: move to temp service
    // Extracting the binary path from the compilation output
    const binaryPathMatch = stdout
      .join('\n')
      .match(
        new RegExp(
          `Binary:\\s*(${repoPath.replace(
            /[-/\\^$*+?.()|[\]{}]/g,
            '\\$&',
          )}.*?\\.wasm)`,
        ),
      );
    if (!binaryPathMatch) {
      throw new Error('Binary path not found in compilation output');
    }
    const binaryPath = binaryPathMatch[1];

    // Read the compiled WASM file
    const { checksum } = await this.tempService.readRustWasmFile(binaryPath);
    const targetPath = path.join(path.dirname(binaryPath), '../..');
    await this.tempService.deleteFolder(targetPath);

    if (rpcResponse.hash !== checksum) {
      return res.status(400).json({ message: 'Code hash mismatch' });
    }

    if (contractData && contractData.code_hash === checksum) {
      return res.status(400).json({ message: "Code hash didn't change" });
    }

    let cid = '';
    if (uploadToIpfs) {
      cid = await this.ipfsService.addFolder(repoPath);
    }

    await verifierService.setContract(accountId, cid, checksum, 'rust');

    return res
      .status(200)
      .json({ message: 'Contract verified successfully', checksum: checksum });
  }
}
