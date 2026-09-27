import { describe, expect, it } from 'vitest';
import { MockFastagGateway } from '../src/payments/mock-fastag.gateway';

describe('MockFastagGateway', () => {
  it('returns a deterministic sandbox authorization reference', async () => {
    const gateway = new MockFastagGateway();
    const request = {
      paymentIntentId: 'f07f36ba-d5fd-42e2-9928-40e198438c29',
      idempotencyKey: 'test-idempotency-0001',
      vehicleRegistration: 'KA01AB1234',
      amountPaise: 50_000,
      currency: 'INR' as const,
      sessionReference: 'session-1',
    };
    const first = await gateway.authorize(request);
    const second = await gateway.authorize(request);
    expect(first.status).toBe('AUTHORIZED');
    expect(first.gatewayReference).toBe(second.gatewayReference);
    expect(first.rawResponse?.sandbox).toBe(true);
  });
});
