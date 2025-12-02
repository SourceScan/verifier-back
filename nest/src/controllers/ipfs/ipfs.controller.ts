import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { IpfsService } from '../../services/ipfs/ipfs.service';

@ApiTags('ipfs')
@Controller('ipfs')
export class IpfsController {
  constructor(private readonly ipfsService: IpfsService) {}

  @Get('structure')
  @ApiOperation({ summary: 'Get folder structure from IPFS CID' })
  @ApiQuery({ name: 'cid', required: true, description: 'IPFS CID' })
  @ApiQuery({
    name: 'path',
    required: false,
    description: 'Path within the CID',
  })
  @ApiOkResponse({ description: 'Folder structure retrieved successfully' })
  async getFolderStructure(
    @Query('cid') cid: string,
    @Query('path') path: string = '',
  ) {
    const structure = await this.ipfsService.listFilesAtPath(cid, path);
    return { cid, structure };
  }
}
