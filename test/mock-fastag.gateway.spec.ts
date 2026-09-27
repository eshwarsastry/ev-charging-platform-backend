import { describe, expect, it } from 'vitest';
import { MockFastagGateway } from '../src/payments/mock-fastag.gateway';

describe('MockFastagGateway', () => {
  it('returns deterministic NETC Mapper-style tag details', async () => {
    const gateway = new MockFastagGateway();
    const first = await gateway.getTagDetails({
      tagId: 'MOCK-ACTIVE-001',
      stationReference: 'station-1',
    });
    const second = await gateway.getTagDetails({
      tagId: 'MOCK-ACTIVE-001',
      stationReference: 'station-1',
    });
    expect(first.status).toBe('ACTIVE');
    expect(first.vehicleRegistration).toBe(second.vehicleRegistration);
    expect(first.exceptionCode).toBe('00');
  });

  it('maps low-balance mock tags to NETC exception state', async () => {
    const gateway = new MockFastagGateway();
    const result = await gateway.getTagDetails({
      tagId: 'MOCK-LOW-001',
      stationReference: 'station-1',
    });
    expect(result.status).toBe('LOW_BALANCE');
    expect(result.exceptionCode).toBe('03');
  });

  it('returns a deterministic post-session debit reference', async () => {
    const gateway = new MockFastagGateway();
    const request = {
      paymentIntentId: 'f07f36ba-d5fd-42e2-9928-40e198438c29',
      idempotencyKey: 'test-idempotency-0001',
      tagId: 'MOCK-ACTIVE-001',
      vehicleRegistration: 'KA01EV0001',
      amountPaise: 50_000,
      currency: 'INR' as const,
      sessionReference: 'session-1',
      stationReference: 'station-1',
      energyWh: 20_000,
    };
    const first = await gateway.debit(request);
    const second = await gateway.debit(request);
    expect(first.status).toBe('CAPTURED');
    expect(first.gatewayReference).toBe(second.gatewayReference);
    expect(first.rawResponse?.merchantType).toBe('EV');
  });
});
