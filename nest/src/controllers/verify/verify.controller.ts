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
import { ContractMetadataDto } from 'src/dtos/contract-metadata.dto';
import { ExecExceptionFilter } from 'src/filters/exec-exception/exec-exception.filter';
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
    const { networkId, accountId, uploadToIpfs } = body;

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

    const contractData: ContractData = await verifierService.getContract(
      accountId,
    );

    const rpcResponse: any = await rpcService.viewCode(accountId);

    if (!rpcResponse) {
      return res
        .status(200)
        .json({ message: 'Error while calling rpc method' });
    }

    if (contractData && contractData.code_hash === rpcResponse.hash) {
      return res.status(200).json({ message: "Code hash didn't change" });
    }

    const contractSourceMetaResponse = await rpcService.callFunction(
      accountId,
      'contract_source_metadata',
    );

    const contractSourceMeta: ContractMetadataDto =
      contractSourceMetaResponse.result;

    if (!contractSourceMeta) {
      return res
        .status(200)
        .json({ message: `No source metadata found for ${accountId}` });
    }

    if (!contractSourceMeta.build_info) {
      return res
        .status(200)
        .json({ message: `No build info found for ${accountId}` });
    }

    return res.status(200).json(contractSourceMeta);

    // await this.compilerService.compileRust(entryPath, attributes);

    // const { checksum } = await this.tempService.readRustWasmFile(entryPath);

    // if (rpcResponse.hash !== checksum) {
    //   return res.status(200).json({ message: 'Code hash mismatch' });
    // }

    // if (contractData && contractData.code_hash === checksum) {
    //   return res.status(200).json({ message: "Code hash didn't change" });
    // }

    // let cid = '';
    // if (uploadToIpfs) {
    //   cid = await this.ipfsService.addFolder(sourcePath);
    // }

    // const builderImage = await this.builderInfoService.getBuilderImage();

    // await verifierService.setContract(
    //   accountId,
    //   cid,
    //   checksum,
    //   'rust',
    //   entryPoint,
    //   builderImage,
    //   github,
    // );

    // return res
    //   .status(HttpStatus.OK)
    //   .json({ message: 'Contract verified successfully', checksum: checksum });
  }
}
