import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ExecException } from '../../exceptions/exec.exception';

@Catch(ExecException)
export class ExecExceptionFilter implements ExceptionFilter {
  catch(exception: ExecException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const message = `Error occurred during command "${exception.command}" execution`;
    const detail = { stderr: exception.stderr, stdout: exception.stdout };

    response.status(status).json({ status, message, detail });
  }
}
