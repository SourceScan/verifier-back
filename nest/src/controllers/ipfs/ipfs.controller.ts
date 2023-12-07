import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { IpfsUploadResponse } from '../../dtos/ipfs.dto';
import { AuthGuard } from '../../guards/auth/auth.guard';
import { IpfsService } from '../../services/ipfs/ipfs.service';

@ApiTags('ipfs')
@Controller('ipfs')
export class IpfsController {
  constructor(private readonly ipfsService: IpfsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a folder to IPFS' })
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    type: IpfsUploadResponse,
    description: 'Folder uploaded successfully',
  })
  async upload(@Req() req, @Res() res: Response) {
    const { sourcePath } = req.jwtPayload;

    const cid = await this.ipfsService.addFolder(sourcePath);

    const ipfsUploadResponse: IpfsUploadResponse = { cid: cid };

    return res.status(200).json(ipfsUploadResponse);
  }

  @Get('structure')
  @ApiOperation({ summary: 'Get folder structure from IPFS CID' })
  @ApiOkResponse({
    description: 'Folder structure retrieved successfully',
  })
  async getFolderStructure(@Req() req, @Res() res: Response) {
    const { cid, path } = req.query;
    const structure = await this.ipfsService.listFilesAtPath(cid, path);

    return res.status(200).json({ cid, structure });
  }
}
