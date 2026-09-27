import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { connectors, evses, providers, stations } from '../database/schema';
import type { NormalizedStation, StationCandidate } from './stations.types';

interface StationRow {
  id: string;
  provider_id: string;
  external_id: string;
  name: string;
  latitude: number;
  longitude: number;
  route_progress: number;
  distance_from_route_meters: number;
  available_connectors: number;
  max_power_kw: number;
  connector_standards: string[] | null;
}

@Injectable()
export class StationsRepository {
  public constructor(private readonly database: DatabaseService) {}

  public async findAlongRoute(input: {
    polyline: GeoJSON.LineString;
    corridorMeters: number;
    connectorStandards: string[];
    minimumPowerKw: number;
  }): Promise<StationCandidate[]> {
    const routeGeoJson = JSON.stringify(input.polyline);
    const result = await this.database.db.execute(sql`
      WITH route AS (
        SELECT ST_SetSRID(ST_GeomFromGeoJSON(${routeGeoJson}), 4326) AS geom
      )
      SELECT
        s.id,
        s.provider_id,
        s.external_id,
        s.name,
        ST_Y(s.location) AS latitude,
        ST_X(s.location) AS longitude,
        ST_LineLocatePoint(route.geom, s.location) AS route_progress,
        ST_Distance(s.location::geography, route.geom::geography) AS distance_from_route_meters,
        COUNT(c.id) FILTER (WHERE e.status = 'AVAILABLE')::int AS available_connectors,
        COALESCE(MAX(c.max_electric_power_watts), 0)::float / 1000 AS max_power_kw,
        ARRAY_AGG(DISTINCT c.standard) FILTER (WHERE c.standard IS NOT NULL) AS connector_standards
      FROM stations s
      CROSS JOIN route
      JOIN evses e ON e.station_id = s.id
      JOIN connectors c ON c.evse_id = e.id
      WHERE s.is_public = true
        AND ST_DWithin(s.location::geography, route.geom::geography, ${input.corridorMeters})
        AND c.standard = ANY(${input.connectorStandards}::text[])
        AND COALESCE(c.max_electric_power_watts, 0) >= ${input.minimumPowerKw * 1000}
      GROUP BY s.id, route.geom
      ORDER BY route_progress ASC, available_connectors DESC, max_power_kw DESC
    `);

    return (result.rows as unknown as StationRow[]).map((row) => ({
      id: row.id,
      providerId: row.provider_id,
      externalId: row.external_id,
      name: row.name,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      routeProgress: Number(row.route_progress),
      distanceFromRouteMeters: Number(row.distance_from_route_meters),
      availableConnectors: Number(row.available_connectors),
      maxPowerKw: Number(row.max_power_kw),
      connectorStandards: row.connector_standards ?? [],
    }));
  }

  public async findNearby(input: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    limit: number;
  }): Promise<Record<string, unknown>[]> {
    const result = await this.database.db.execute(sql`
      SELECT
        s.id,
        s.provider_id,
        s.external_id,
        s.name,
        s.address,
        s.city,
        s.state,
        ST_Y(s.location) AS latitude,
        ST_X(s.location) AS longitude,
        ST_Distance(
          s.location::geography,
          ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography
        ) AS distance_meters,
        COUNT(c.id) FILTER (WHERE e.status = 'AVAILABLE')::int AS available_connectors,
        COALESCE(MAX(c.max_electric_power_watts), 0)::float / 1000 AS max_power_kw
      FROM stations s
      LEFT JOIN evses e ON e.station_id = s.id
      LEFT JOIN connectors c ON c.evse_id = e.id
      WHERE ST_DWithin(
        s.location::geography,
        ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography,
        ${input.radiusMeters}
      )
      GROUP BY s.id
      ORDER BY distance_meters ASC
      LIMIT ${input.limit}
    `);
    return result.rows;
  }

  public async upsertProviderStations(
    providerId: string,
    locations: NormalizedStation[],
  ): Promise<number> {
    await this.database.db.transaction(async (transaction) => {
      await transaction
        .update(providers)
        .set({ enabled: true, lastSyncedAt: new Date(), updatedAt: new Date() })
        .where(eq(providers.id, providerId));

      for (const location of locations) {
        const [station] = await transaction
          .insert(stations)
          .values({
            providerId,
            externalId: location.externalId,
            name: location.name,
            address: location.address,
            city: location.city,
            state: location.state,
            postalCode: location.postalCode,
            countryCode: location.countryCode,
            location: { x: location.longitude, y: location.latitude },
            isPublic: location.isPublic,
            raw: location.raw,
          })
          .onConflictDoUpdate({
            target: [stations.providerId, stations.externalId],
            set: {
              name: location.name,
              address: location.address,
              city: location.city,
              state: location.state,
              postalCode: location.postalCode,
              location: { x: location.longitude, y: location.latitude },
              raw: location.raw,
              updatedAt: new Date(),
            },
          })
          .returning({ id: stations.id });

        if (!station) continue;
        for (const evse of location.evses) {
          const [savedEvse] = await transaction
            .insert(evses)
            .values({
              stationId: station.id,
              externalUid: evse.externalUid,
              status: evse.status,
              floorLevel: evse.floorLevel,
              lastUpdated: evse.lastUpdated,
            })
            .onConflictDoUpdate({
              target: [evses.stationId, evses.externalUid],
              set: {
                status: evse.status,
                floorLevel: evse.floorLevel,
                lastUpdated: evse.lastUpdated,
              },
            })
            .returning({ id: evses.id });

          if (!savedEvse) continue;
          for (const connector of evse.connectors) {
            await transaction
              .insert(connectors)
              .values({ evseId: savedEvse.id, ...connector })
              .onConflictDoUpdate({
                target: [connectors.evseId, connectors.externalId],
                set: {
                  standard: connector.standard,
                  format: connector.format,
                  powerType: connector.powerType,
                  maxVoltage: connector.maxVoltage,
                  maxAmperage: connector.maxAmperage,
                  maxElectricPowerWatts: connector.maxElectricPowerWatts,
                  tariffIds: connector.tariffIds,
                  lastUpdated: connector.lastUpdated,
                },
              });
          }
        }
      }
    });
    return locations.length;
  }

  public async countForProvider(providerId: string): Promise<number> {
    const [result] = await this.database.db
      .select({ count: sql<number>`count(*)::int` })
      .from(stations)
      .where(and(eq(stations.providerId, providerId), eq(stations.isPublic, true)));
    return result?.count ?? 0;
  }
}
