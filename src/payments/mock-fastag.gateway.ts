import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type {
  FastagDebitRequest,
  FastagDebitResult,
  FastagGateway,
  FastagTagDetailsRequest,
  FastagTagDetailsResult,
  FastagTagStatus,
} from './fastag-gateway';

function statusForMockTag(tagId: string): FastagTagStatus {
  const value = tagId.toUpperCase();
  if (value.startsWith('MOCK-HOT-')) return 'HOTLISTED';
  if (value.startsWith('MOCK-LOW-')) return 'LOW_BALANCE';
  if (value.startsWith('MOCK-EXEMPT-')) return 'EXEMPTED';
  if (value.startsWith('MOCK-BLACK-')) return 'BLACKLISTED';
  if (value.startsWith('MOCK-CLOSED-')) return 'CLOSED';
  if (value.startsWith('MOCK-UNKNOWN-')) return 'UNREGISTERED';
  return 'ACTIVE';
}

function exceptionCodeForStatus(status: FastagTagStatus): string | undefined {
  const values: Partial<Record<FastagTagStatus, string>> = {
    ACTIVE: '00',
    HOTLISTED: '01',
    EXEMPTED: '02',
    LOW_BALANCE: '03',
    BLACKLISTED: '05',
    CLOSED: '06',
  };
  return values[status];
}

@Injectable()
export class MockFastagGateway implements FastagGateway {
  public readonly name = 'netc-fastag-mock';

  public async getTagDetails(
    request: FastagTagDetailsRequest,
  ): Promise<FastagTagDetailsResult> {
    const digest = createHash('sha256').update(request.tagId).digest('hex');
    const serial = Number.parseInt(digest.slice(0, 6), 16) % 10_000;
    const status = statusForMockTag(request.tagId);

    return Promise.resolve({
      status,
      vehicleRegistration: `KA01EV${serial.toString().padStart(4, '0')}`,
      vehicleClass: 'VC4',
      issuerBankId: 'MOCK-NETC-ISSUER',
      commercialVehicle: false,
      issueDate: '2026-01-01',
      exceptionCode: exceptionCodeForStatus(status),
      rawResponse: {
        sandbox: true,
        stationReference: request.stationReference,
        message: 'Mock NETC Mapper response; no production NETC lookup occurred',
      },
    });
  }

  public async debit(request: FastagDebitRequest): Promise<FastagDebitResult> {
    const gatewayReference = `MOCK-EV-${createHash('sha256')
      .update(request.idempotencyKey)
      .digest('hex')
      .slice(0, 20)
      .toUpperCase()}`;

    return Promise.resolve({
      status: 'CAPTURED',
      gatewayReference,
      rawResponse: {
        sandbox: true,
        merchantType: 'EV',
        message: 'Mock NETC EV debit only; no funds were moved',
      },
    });
  }
}
