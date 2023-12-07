import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { GenKeyDto } from '../../dtos/gateway.dto';
import { EncryptionService } from '../../services/encryption/encryption.service';

@ApiTags('gateway')
@Controller('gateway')
export class GatewayController {
  constructor(private readonly encryptionService: EncryptionService) {}

  @Post('genKey')
  @ApiOperation({ summary: 'Generate encryption key' })
  @ApiBody({ type: GenKeyDto })
  @ApiOkResponse({ type: String, description: 'Key generated successfully' })
  async genKey(@Body() body: GenKeyDto, @Res() res: Response) {
    const { accessToken, lang, entryPoint, github, accountId } = body;

    const output = this.encryptionService.encrypt({
      accessToken: accessToken,
      lang: lang,
      entryPoint: entryPoint,
      github: github,
      accountId: accountId,
    });

    res.status(200).json(output);
  }

  @Post('decryptKey')
  @ApiOperation({ summary: 'Retrieve data from the key' })
  @ApiBody({ description: 'Key to decrypt data' })
  @ApiOkResponse({ type: GenKeyDto, description: 'Data retrieved' })
  async getData(@Req() req: Request, @Res() res: Response) {
    const decryptedData = this.encryptionService.decrypt(req.body.key);

    res.status(200).json(decryptedData);
  }
}
