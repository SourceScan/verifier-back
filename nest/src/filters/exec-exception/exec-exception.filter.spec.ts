import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ExecException } from '../../exceptions/exec.exception';
import { ExecExceptionFilter } from './exec-exception.filter';

describe('ExecExceptionFilter', () => {
  let filter: ExecExceptionFilter;

  beforeEach(() => {
    filter = new ExecExceptionFilter();
  });

  it('should format the response correctly for ExecException', () => {
    const mockCommand = 'test-command';
    const mockStderr = ['error message'];
    const mockStdout = ['output message'];
    const exception = new ExecException(
      mockCommand,
      'Error',
      mockStdout,
      mockStderr,
    );

    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockImplementation(() => ({ json: mockJson }));

    const mockResponse = { status: mockStatus } as unknown as Response;
    const mockRequest = { url: '/test-url' };

    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: `Error occurred during command "${mockCommand}" execution`,
      detail: { stderr: mockStderr, stdout: mockStdout },
    });
  });
});
