import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import type { Environment } from '../config/env';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  public constructor(private readonly config: ConfigService<Environment, true>) {}

  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const supplied = request.headers['x-admin-api-key'];
    const expected = this.config.get('ADMIN_API_KEY', { infer: true });
    if (typeof supplied !== 'string') {
      throw new UnauthorizedException('Missing admin API key');
    }

    const suppliedBuffer = Buffer.from(supplied);
    const expectedBuffer = Buffer.from(expected);
    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid admin API key');
    }
    return true;
  }
}
