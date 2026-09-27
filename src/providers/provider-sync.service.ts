import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { providerSyncRuns } from '../database/schema';
import { StationsRepository } from '../stations/stations.repository';
import type { NormalizedConnectorStatus, NormalizedStation } from '../stations/stations.types';
import { OcpiClient } from './ocpi.client';
import type { OcpiLocation } from './ocpi.types';
import { ProviderConfigService } from './provider-config.service';

@Injectable()
export class ProviderSyncService {
  public constructor(
    private readonly configs: ProviderConfigService,
    private readonly stations: StationsRepository,
    private readonly database: DatabaseService,
  ) {}

  public status(): Array<{
    id: string;
    displayName: string;
    configured: boolean;
  }> {
    return this.configs.all().map((provider) => ({
      id: provider.id,
      displayName: provider.displayName,
      configured: provider.enabled && Boolean(provider.baseUrl && provider.token),
    }));
  }

  public async sync(
    providerId: string,
  ): Promise<{ providerId: string; importedLocations: number }> {
    const provider = this.configs.get(providerId);
    if (!provider) throw new NotFoundException(`Unknown provider: ${providerId}`);
    if (!provider.enabled || !provider.baseUrl || !provider.token) {
      throw new ServiceUnavailableException({
        code: 'PROVIDER_NOT_CONFIGURED',
        message: `${provider.displayName} credentials have not been configured`,
      });
    }

    const [run] = await this.database.db
      .insert(providerSyncRuns)
      .values({ providerId, status: 'RUNNING' })
      .returning({ id: providerSyncRuns.id });

    try {
      const locations = await new OcpiClient(provider).getLocations();
      const importedLocations = await this.stations.upsertProviderStations(
        provider.id,
        locations.map((location) => this.normalize(location)),
      );
      if (run) {
        await this.database.db
          .update(providerSyncRuns)
          .set({ status: 'SUCCEEDED', importedLocations, finishedAt: new Date() })
          .where(eq(providerSyncRuns.id, run.id));
      }
      return { providerId, importedLocations };
    } catch (error) {
      if (run) {
        await this.database.db
          .update(providerSyncRuns)
          .set({
            status: 'FAILED',
            error: error instanceof Error ? error.message.slice(0, 2_000) : 'Unknown error',
            finishedAt: new Date(),
          })
          .where(eq(providerSyncRuns.id, run.id));
      }
      throw error;
    }
  }

  private normalize(location: OcpiLocation): NormalizedStation {
    return {
      externalId: location.id,
      name: location.name ?? `${location.address ?? 'Charging station'} - ${location.city ?? ''}`,
      address: location.address,
      city: location.city,
      state: location.state,
      postalCode: location.postal_code,
      countryCode: location.country ?? 'IND',
      latitude: Number.parseFloat(location.coordinates.latitude),
      longitude: Number.parseFloat(location.coordinates.longitude),
      isPublic: true,
      raw: location,
      evses: (location.evses ?? []).map((evse) => ({
        externalUid: evse.uid,
        status: this.normalizeStatus(evse.status),
        floorLevel: evse.floor_level,
        lastUpdated: evse.last_updated ? new Date(evse.last_updated) : undefined,
        connectors: evse.connectors.map((connector) => ({
          externalId: connector.id,
          standard: connector.standard,
          format: connector.format,
          powerType: connector.power_type,
          maxVoltage: connector.max_voltage,
          maxAmperage: connector.max_amperage,
          maxElectricPowerWatts: connector.max_electric_power,
          tariffIds: connector.tariff_ids,
          lastUpdated: connector.last_updated ? new Date(connector.last_updated) : undefined,
        })),
      })),
    };
  }

  private normalizeStatus(status: string): NormalizedConnectorStatus {
    const supported: NormalizedConnectorStatus[] = [
      'AVAILABLE',
      'CHARGING',
      'OCCUPIED',
      'RESERVED',
      'OUTOFORDER',
      'INOPERATIVE',
      'UNKNOWN',
    ];
    return supported.includes(status as NormalizedConnectorStatus)
      ? (status as NormalizedConnectorStatus)
      : 'UNKNOWN';
  }
}
