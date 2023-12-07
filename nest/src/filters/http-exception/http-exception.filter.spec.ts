import { ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('should format the response correctly', () => {
    const status = 404;
    const exception = new HttpException('Not Found', status);

    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockImplementation(() => ({ json: mockJson }));

    const mockResponse = { status: mockStatus } as unknown as Response;
    const mockRequest = { url: '/test-url' } as unknown as Request;

    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(status);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: status,
      message: 'Not Found',
      timestamp: expect.any(String),
      path: '/test-url',
    });
  });
});
