import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { SandboxController } from '../src/payments/sandbox.controller';
import { MockFastagGateway } from '../src/payments/mock-fastag.gateway';
import { validateEnvironment, type Environment } from '../src/config/env';

function controller(enabled: boolean) {
  const env = validateEnvironment({
    DATABASE_URL: 'postgresql://localhost/test',
    ADMIN_API_KEY: 'a'.repeat(32),
    GOOGLE_MAPS_API_KEY: 'test',
    FASTAG_WEBHOOK_SECRET: 'b'.repeat(32),
    ENABLE_PAYMENT_SANDBOX: String(enabled),
  });
  return new SandboxController(new ConfigService<Environment, true>(env), new MockFastagGateway());
}
const requestId = 'b8034f17-765d-40d0-b00b-ffec2b7e369d';
describe('payment sandbox', () => {
  it('is disabled unless explicitly enabled', async () => {
    expect(controller(false).capabilities()).toMatchObject({
      paymentSandbox: false,
      livePayments: false,
    });
    await expect(controller(false).demo({ requestId, scenario: 'active' })).rejects.toThrow(
      'disabled',
    );
  });
  it('returns a deterministic simulated receipt', async () => {
    const app = controller(true);
    const receipt = await app.demo({ requestId, scenario: 'active' });
    expect(receipt).toMatchObject({ sandbox: true, status: 'CAPTURED', amountPaise: 24000 });
    expect(await app.demo({ requestId, scenario: 'active' })).toEqual(receipt);
  });
  it.each(['low-balance', 'blacklisted'] as const)('rejects %s tags', async (scenario) => {
    expect(await controller(true).demo({ requestId, scenario })).toMatchObject({
      sandbox: true,
      status: 'REJECTED',
    });
  });
});
