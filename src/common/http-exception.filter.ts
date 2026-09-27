import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<FastifyRequest>();
    const reply = context.getResponse<FastifyReply>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const response = isHttpException ? exception.getResponse() : null;

    if (!isHttpException) {
      request.log.error({ err: exception }, 'Unhandled request error');
    }

    void reply.status(status).send({
      statusCode: status,
      error: HttpStatus[status] ?? 'Error',
      message:
        typeof response === 'string'
          ? response
          : ((response as { message?: unknown } | null)?.message ?? 'Unexpected error'),
      details: typeof response === 'object' ? response : undefined,
      path: request.url,
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  }
}
