import { BadGatewayException } from '@nestjs/common';
import type { OcpiLocation, OcpiResponse, ProviderConfiguration } from './ocpi.types';

export class OcpiClient {
  public constructor(private readonly provider: ProviderConfiguration) {}

  public async getLocations(): Promise<OcpiLocation[]> {
    if (!this.provider.enabled || !this.provider.baseUrl || !this.provider.token) {
      return [];
    }

    const locations: OcpiLocation[] = [];
    const limit = 100;
    let offset = 0;

    while (true) {
      const url = new URL(`${this.provider.baseUrl.replace(/\/$/, '')}/locations`);
      url.searchParams.set('offset', String(offset));
      url.searchParams.set('limit', String(limit));

      const response = await fetch(url, {
        headers: {
          authorization: `Token ${this.provider.token}`,
          accept: 'application/json',
        },
        signal: AbortSignal.timeout(20_000),
      });

      if (!response.ok) {
        throw new BadGatewayException({
          code: 'OCPI_PROVIDER_ERROR',
          provider: this.provider.id,
          status: response.status,
          message: (await response.text()).slice(0, 1_000),
        });
      }

      const payload = (await response.json()) as OcpiResponse<OcpiLocation[]>;
      if (payload.status_code < 1000 || payload.status_code >= 2000) {
        throw new BadGatewayException({
          code: 'OCPI_PROTOCOL_ERROR',
          provider: this.provider.id,
          ocpiStatusCode: payload.status_code,
          message: payload.status_message,
        });
      }

      locations.push(...payload.data);
      if (payload.data.length < limit) break;
      offset += limit;
    }

    return locations;
  }
}
