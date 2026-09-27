import { describe, expect, it } from 'vitest';
import type { RoutesClient } from '../src/maps/maps.types';
import type { StationsRepository } from '../src/stations/stations.repository';
import type { StationCandidate } from '../src/stations/stations.types';
import { TripPlannerService, type TripPlanInput } from '../src/trips/trip-planner.service';

const line: GeoJSON.LineString = {
  type: 'LineString',
  coordinates: [
    [77.59, 12.97],
    [78.7, 11.6],
  ],
};

const input: TripPlanInput = {
  origin: { latitude: 12.97, longitude: 77.59 },
  destination: { latitude: 11.6, longitude: 78.7 },
  vehicle: {
    batteryCapacityKwh: 40,
    efficiencyWhPerKm: 160,
    startingSocPercent: 80,
    reserveSocPercent: 10,
    targetChargeSocPercent: 80,
    connectorStandards: ['IEC_62196_T2_COMBO'],
  },
  preferences: { minimumPowerKw: 30, corridorMeters: 8_000 },
};

function makeService(distanceMeters: number, candidates: StationCandidate[]) {
  const routes: RoutesClient = {
    computeRoute: () =>
      Promise.resolve({ distanceMeters, durationSeconds: 12_000, polyline: line }),
    computeMatrix: () => Promise.resolve([]),
  };
  const stations = {
    findAlongRoute: () => Promise.resolve(candidates),
  } as unknown as StationsRepository;
  return new TripPlannerService(routes, stations);
}

describe('TripPlannerService', () => {
  it('returns a direct route when the destination is within range', async () => {
    const result = await makeService(100_000, []).plan(input);
    expect(result.stops).toEqual([]);
  });

  it('selects a reachable compatible charging stop', async () => {
    const result = await makeService(300_000, [
      {
        id: 'station-1',
        providerId: 'ionage',
        externalId: 'ION-1',
        name: 'Highway Fast Charger',
        latitude: 12.2,
        longitude: 78.1,
        routeProgress: 0.5,
        distanceFromRouteMeters: 250,
        availableConnectors: 2,
        maxPowerKw: 60,
        connectorStandards: ['IEC_62196_T2_COMBO'],
      },
    ]).plan(input);

    expect(result.stops).toHaveLength(1);
    expect(result.stops[0]?.providerId).toBe('ionage');
    expect(result.stops[0]?.arrivalSocPercent).toBe(20);
    expect(result.stops[0]?.estimatedChargingMinutes).toBeGreaterThan(0);
  });

  it('fails safely when no reachable live charger exists', async () => {
    await expect(makeService(300_000, []).plan(input)).rejects.toMatchObject({
      response: { code: 'NO_REACHABLE_CHARGER' },
    });
  });
});
