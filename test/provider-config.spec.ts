import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { validateEnvironment, type Environment } from '../src/config/env';
import { ProviderConfigService } from '../src/providers/provider-config.service';

const base = {
  DATABASE_URL: 'postgresql://localhost/test',
  ADMIN_API_KEY: 'a'.repeat(32),
  GOOGLE_MAPS_API_KEY: 'test',
  FASTAG_WEBHOOK_SECRET: 'b'.repeat(32),
};
const provider = {
  id: 'new-vendor',
  displayName: 'New Vendor',
  baseUrl: 'https://vendor.example/ocpi/2.2.1',
  token: 'secret',
};

describe('provider configuration', () => {
  it('allows discovery to start with blank optional partner URLs and no routing key', () => {
    expect(
      validateEnvironment({
        ...base,
        GOOGLE_MAPS_API_KEY: '',
        PULSE_ENERGY_OCPI_BASE_URL: '',
        IONAGE_OCPI_BASE_URL: '',
        FASTAG_PARTNER_BASE_URL: '',
      }).PULSE_ENERGY_OCPI_BASE_URL,
    ).toBeUndefined();
  });
  it('accepts additional vendors without changing source code', () => {
    const env = validateEnvironment({ ...base, OCPI_PROVIDERS_JSON: JSON.stringify([provider]) });
    const service = new ProviderConfigService(new ConfigService<Environment, true>(env));
    expect(service.get('new-vendor')).toMatchObject({ ...provider, enabled: true });
    expect(service.all()).toHaveLength(3);
  });
  it.each([
    'invalid json',
    JSON.stringify([provider, provider]),
    JSON.stringify([{ ...provider, id: 'ionage' }]),
    JSON.stringify([{ ...provider, baseUrl: 'http://vendor.example' }]),
  ])('rejects invalid provider configuration', (value) => {
    expect(() => validateEnvironment({ ...base, OCPI_PROVIDERS_JSON: value })).toThrow();
  });
  it('cannot enable the sandbox with a live gateway', () => {
    expect(() =>
      validateEnvironment({ ...base, ENABLE_PAYMENT_SANDBOX: 'true', FASTAG_MODE: 'partner' }),
    ).toThrow();
  });
});
