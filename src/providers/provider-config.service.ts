import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/env';
import type { ProviderConfiguration } from './ocpi.types';

@Injectable()
export class ProviderConfigService {
  public constructor(private readonly config: ConfigService<Environment, true>) {}

  public all(): ProviderConfiguration[] {
    return [
      ...this.config.get('OCPI_PROVIDERS_JSON', { infer: true }),
      {
        id: 'pulse-energy',
        displayName: 'Pulse Energy',
        enabled: this.config.get('PULSE_ENERGY_ENABLED', { infer: true }),
        baseUrl: this.config.get('PULSE_ENERGY_OCPI_BASE_URL', { infer: true }),
        token: this.config.get('PULSE_ENERGY_OCPI_TOKEN', { infer: true }),
      },
      {
        id: 'ionage',
        displayName: 'IONAGE',
        enabled: this.config.get('IONAGE_ENABLED', { infer: true }),
        baseUrl: this.config.get('IONAGE_OCPI_BASE_URL', { infer: true }),
        token: this.config.get('IONAGE_OCPI_TOKEN', { infer: true }),
      },
    ];
  }

  public get(providerId: string): ProviderConfiguration | undefined {
    return this.all().find((provider) => provider.id === providerId);
  }
}
