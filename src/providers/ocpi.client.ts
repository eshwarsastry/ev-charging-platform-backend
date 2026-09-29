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
    let url = new URL(`${this.provider.baseUrl.replace(/\/$/, '')}/locations`);
    url.searchParams.set('offset', '0');
    url.searchParams.set('limit', String(limit));
    const origin = url.origin;
    const visited = new Set<string>();

    while (true) {
      if (
        url.origin !== origin ||
        url.username ||
        url.password ||
        visited.has(url.href) ||
        visited.size >= 1000
      ) {
        throw new BadGatewayException('Unsafe or repeated OCPI pagination link');
      }
      visited.add(url.href);

      const response = await fetch(url, {
        headers: {
          authorization: `Token ${Buffer.from(this.provider.token).toString('base64')}`,
          accept: 'application/json',
        },
        signal: AbortSignal.timeout(20_000),
        redirect: 'error',
      });

      if (!response.ok) {
        throw new BadGatewayException({
          code: 'OCPI_PROVIDER_ERROR',
          provider: this.provider.id,
          status: response.status,
          message: 'OCPI provider request failed',
        });
      }

      const payload = (await response.json()) as OcpiResponse<OcpiLocation[]>;
      if (payload.status_code !== 1000 || !Array.isArray(payload.data)) {
        throw new BadGatewayException({
          code: 'OCPI_PROTOCOL_ERROR',
          provider: this.provider.id,
          ocpiStatusCode: payload.status_code,
          message: 'Invalid OCPI response',
        });
      }

      locations.push(...payload.data);
      const next = response.headers
        .get('link')
        ?.split(',')
        .map((link) => link.match(/<([^>]+)>;\s*rel="?next"?/i)?.[1])
        .find(Boolean);
      if (!next) break;
      url = new URL(next, url);
    }

    return locations;
  }
}
