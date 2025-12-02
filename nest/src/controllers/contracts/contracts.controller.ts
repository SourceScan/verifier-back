import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { VerifierService } from '../../modules/near/services/verifier.service';

@ApiTags('contracts')
@Controller('contracts')
export class ContractsController {
  constructor(
    @Inject('MainnetVerifierService')
    private readonly mainnetVerifierService: VerifierService,
    @Inject('TestnetVerifierService')
    private readonly testnetVerifierService: VerifierService,
  ) {}

  private getVerifierService(networkId: string): VerifierService {
    return networkId === 'mainnet'
      ? this.mainnetVerifierService
      : this.testnetVerifierService;
  }

  @Get('count')
  @ApiOperation({ summary: 'Get total number of verified contracts' })
  @ApiQuery({
    name: 'networkId',
    required: false,
    description: 'Network ID (mainnet or testnet)',
    example: 'mainnet',
  })
  @ApiOkResponse({ description: 'Total count of verified contracts' })
  async getContractsCount(@Query('networkId') networkId: string = 'mainnet') {
    const verifierService = this.getVerifierService(networkId);
    const count = await verifierService.getContractsCount();
    return { networkId, count };
  }

  @Get('by-code-hash/:codeHash')
  @ApiOperation({
    summary: 'Get all verified contracts with the same code hash',
  })
  @ApiParam({
    name: 'codeHash',
    required: true,
    description: 'Code hash to search for',
  })
  @ApiQuery({
    name: 'networkId',
    required: false,
    description: 'Network ID (mainnet or testnet)',
    example: 'mainnet',
  })
  @ApiOkResponse({
    description: 'List of contracts with the specified code hash',
  })
  async getContractsByCodeHash(
    @Param('codeHash') codeHash: string,
    @Query('networkId') networkId: string = 'mainnet',
  ) {
    const verifierService = this.getVerifierService(networkId);
    const contracts = await verifierService.getContractsByCodeHash(codeHash);
    return { networkId, codeHash, contracts };
  }
}
