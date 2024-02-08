import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import path from 'path';
import { BuilderImageInfoResponse, VerifyRustDto } from '../../dtos/verify.dto';
import { ExecException } from '../../exceptions/exec.exception';
import { ExecExceptionFilter } from '../../filters/exec-exception/exec-exception.filter';
import { AuthGuard } from '../../guards/auth/auth.guard';
import ContractData from '../../modules/near/interfaces/contract-data.interface';
import { RpcService } from '../../modules/near/services/rpc.service';
import { VerifierService } from '../../modules/near/services/verifier.service';
import { BuilderInfoService } from '../../services/builder-info/builder-info.service';
import { CompilerService } from '../../services/compiler/compiler.service';
import { IpfsService } from '../../services/ipfs/ipfs.service';
import { TempService } from '../../services/temp/temp.service';

@ApiTags('verify')
@ApiExtraModels(ExecException)
@Controller('verify')
export class VerifyController {
  constructor(
    private readonly compilerService: CompilerService,
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
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
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
  async verifyRust(
    @Req() req,
    @Body() body: VerifyRustDto,
    @Res() res: Response,
  ) {
    const { sourcePath, github } = req.jwtPayload;
    const { entryPoint, networkId, accountId, uploadToIpfs, attributes } = body;
    const entryPath = path.dirname(path.join(sourcePath, entryPoint));

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

    await this.compilerService.compileRust(entryPath, attributes);

    const { checksum } = await this.tempService.readRustWasmFile(entryPath);

    const rpcResponse: any = await rpcService.viewCode(accountId);

    if (!rpcResponse) {
      return res
        .status(200)
        .json({ message: 'Error while calling rpc method' });
    }

    if (rpcResponse.hash !== checksum) {
      return res.status(200).json({ message: 'Code hash mismatch' });
    }

    const contractData: ContractData = await verifierService.getContract(
      accountId,
    );

    if (contractData && contractData.code_hash === checksum) {
      return res.status(200).json({ message: "Code hash didn't change" });
    }

    let cid = '';
    if (uploadToIpfs) {
      cid = await this.ipfsService.addFolder(sourcePath);
    }

    const builderImage = await this.builderInfoService.getBuilderImage();

    await verifierService.setContract(
      accountId,
      cid,
      checksum,
      'rust',
      entryPoint,
      builderImage,
      github,
    );

    return res
      .status(HttpStatus.OK)
      .json({ message: 'Contract verified successfully', checksum: checksum });
  }

  @Get('builderInfo')
  @ApiOperation({
    summary: 'Get builder image information',
  })
  @ApiResponse({
    status: 200,
    description: 'Builder image information',
    type: BuilderImageInfoResponse,
  })
  getBuilderInfo(): BuilderImageInfoResponse {
    const response: BuilderImageInfoResponse = {
      builderImage: this.builderInfoService.getBuilderImage(),
    };
    return response;
  }
}
