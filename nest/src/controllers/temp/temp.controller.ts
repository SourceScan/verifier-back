import {
  Body,
  Controller,
  Delete,
  HttpStatus,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import {
  DeleteFolderResponse,
  GithubDto,
  GithubImportResponse,
} from '../../dtos/github.dto';
import { ExecException } from '../../exceptions/exec.exception';
import { ExecExceptionFilter } from '../../filters/exec-exception/exec-exception.filter';
import { AuthGuard } from '../../guards/auth/auth.guard';
import { AuthService } from '../../services/auth/auth.service';
import { GithubService } from '../../services/github/github.service';
import { TempService } from '../../services/temp/temp.service';

@ApiTags('temp')
@ApiExtraModels(ExecException)
@Controller('temp')
export class TempController {
  constructor(
    private readonly tempService: TempService,
    private readonly githubService: GithubService,
    private readonly authService: AuthService,
  ) {}

  @Post('github')
  @UseFilters(ExecExceptionFilter)
  @ApiOperation({ summary: 'Import from GitHub' })
  @ApiBody({ type: GithubDto }) // Describes the request body
  @ApiOkResponse({
    type: GithubImportResponse,
    description: 'GitHub import successful',
  })
  @ApiResponse({
    status: 500,
    description: 'Execution exception occurred',
    type: ExecException,
  })
  async github(@Body() body: GithubDto, @Res() res: Response) {
    const { repo, sha } = body;
    const tempFolder = await this.tempService.createFolder();

    await this.githubService.clone(tempFolder, repo);

    const repoPath = `${tempFolder}/${repo.split('/').pop()}`;
    await this.githubService.checkout(repoPath, sha);

    const files = await this.tempService.getMatchingFiles(tempFolder, repoPath);
    const filteredFiles = files.filter(
      (file) => file.endsWith('package.json') || file.endsWith('Cargo.toml'),
    );

    const hasBuildRs = files.some((file) => file.endsWith('build.rs'));
    if (hasBuildRs) {
      await this.tempService.deleteFolder(tempFolder);
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Repository contain a build.rs file which is restricted',
      });
    }

    const repoInfo = await this.githubService.getRepoInfo(repo, sha);

    return res.status(HttpStatus.OK).json({
      accessToken: await this.authService.genJwtKey(tempFolder, repoInfo),
      files: filteredFiles,
    });
  }

  @Delete('delete')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Delete temp folder' })
  @ApiBearerAuth()
  @ApiOkResponse({
    type: DeleteFolderResponse,
    description: 'Folder deleted successfully',
  })
  async deleteFolder(@Req() req, @Res() res: Response) {
    const { sourcePath } = req.jwtPayload;
    await this.tempService.deleteFolder(sourcePath);
    return res
      .status(HttpStatus.OK)
      .json({ message: 'Folder deleted successfully' });
  }
}
