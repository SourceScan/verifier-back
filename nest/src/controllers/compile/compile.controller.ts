import {
  Body,
  Controller,
  HttpStatus,
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
import { CompileRustDto } from '../../dtos/compile.dto';
import { ExecException } from '../../exceptions/exec.exception';
import { ExecExceptionFilter } from '../../filters/exec-exception/exec-exception.filter';
import { AuthGuard } from '../../guards/auth/auth.guard';
import { CompilerService } from '../../services/compiler/compiler.service';
import { TempService } from '../../services/temp/temp.service';

@ApiTags('compile')
@ApiExtraModels(ExecException)
@Controller('compile')
export class CompileController {
  constructor(
    private readonly compilerService: CompilerService,
    private readonly tempService: TempService,
  ) {}

  @Post('rust')
  @UseFilters(ExecExceptionFilter)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Compile Rust source code' })
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
  async compileRust(
    @Req() req,
    @Body() body: CompileRustDto,
    @Res() res: Response,
  ) {
    res.setTimeout(10 * 60 * 1000);

    const { sourcePath } = req.jwtPayload;
    const { entryPoint } = body;
    const entryPath = path.dirname(path.join(sourcePath, entryPoint));

    await this.compilerService.compileRust(entryPath);

    const { wasmBase64, checksum } = await this.tempService.readRustWasmFile(
      wasmPath,
    );

    res
      .status(HttpStatus.OK)
      .json({ wasmBase64: wasmBase64, checksum: checksum });
  }
}
