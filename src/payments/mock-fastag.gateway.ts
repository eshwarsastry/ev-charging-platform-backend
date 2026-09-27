import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type {
  FastagAuthorizationRequest,
  FastagAuthorizationResult,
  FastagGateway,
} from './fastag-gateway';

@Injectable()
export class MockFastagGateway implements FastagGateway {
  public readonly name = 'netc-fastag-mock';

  public async authorize(request: FastagAuthorizationRequest): Promise<FastagAuthorizationResult> {
    const gatewayReference = `MOCK-${createHash('sha256')
      .update(request.idempotencyKey)
      .digest('hex')
      .slice(0, 20)
      .toUpperCase()}`;

    return Promise.resolve({
      status: 'AUTHORIZED',
      gatewayReference,
      rawResponse: {
        sandbox: true,
        message: 'Mock authorization only; no NETC funds were moved',
      },
    });
  }
}
