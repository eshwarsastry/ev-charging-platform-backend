import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ROUTES_CLIENT, type RouteResult, type RoutesClient } from '../maps/maps.types';
import { StationsRepository } from '../stations/stations.repository';
import type { StationCandidate } from '../stations/stations.types';

export interface TripPlanInput {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  vehicle: {
    batteryCapacityKwh: number;
    efficiencyWhPerKm: number;
    startingSocPercent: number;
    reserveSocPercent: number;
    targetChargeSocPercent: number;
    connectorStandards: string[];
  };
  preferences: {
    minimumPowerKw: number;
    corridorMeters: number;
  };
}

export interface ChargingStop {
  stationId: string;
  providerId: string;
  name: string;
  location: { latitude: number; longitude: number };
  arrivalSocPercent: number;
  departureSocPercent: number;
  energyAddedKwh: number;
  estimatedChargingMinutes: number;
  maxPowerKw: number;
  liveAvailableConnectors: number;
}

@Injectable()
export class TripPlannerService {
  public constructor(
    @Inject(ROUTES_CLIENT) private readonly routes: RoutesClient,
    private readonly stations: StationsRepository,
  ) {}

  public async plan(input: TripPlanInput): Promise<{
    route: RouteResult;
    stops: ChargingStop[];
    warnings: string[];
  }> {
    const directRoute = await this.routes.computeRoute({
      origin: input.origin,
      destination: input.destination,
    });

    const candidates = await this.stations.findAlongRoute({
      polyline: directRoute.polyline,
      corridorMeters: input.preferences.corridorMeters,
      connectorStandards: input.vehicle.connectorStandards,
      minimumPowerKw: input.preferences.minimumPowerKw,
    });

    const stops = this.selectStops(input, directRoute.distanceMeters, candidates);
    const finalRoute = stops.length
      ? await this.routes.computeRoute({
          origin: input.origin,
          destination: input.destination,
          intermediates: stops.map((stop) => stop.location),
        })
      : directRoute;

    return {
      route: finalRoute,
      stops,
      warnings: [
        'Energy use is an estimate; weather, elevation, traffic, HVAC and battery condition affect range.',
        'Live availability can change before arrival and should be refreshed during the trip.',
      ],
    };
  }

  public selectStops(
    input: TripPlanInput,
    routeDistanceMeters: number,
    candidates: StationCandidate[],
  ): ChargingStop[] {
    const stops: ChargingStop[] = [];
    let currentDistanceMeters = 0;
    let currentSoc = input.vehicle.startingSocPercent;

    for (let stopNumber = 0; stopNumber < 10; stopNumber += 1) {
      const reachableMeters = this.rangeMeters(
        input.vehicle,
        currentSoc,
        input.vehicle.reserveSocPercent,
      );

      if (currentDistanceMeters + reachableMeters >= routeDistanceMeters) return stops;

      const reachableCandidates = candidates.filter((candidate) => {
        const distance = candidate.routeProgress * routeDistanceMeters;
        return (
          distance > currentDistanceMeters + 500 &&
          distance <= currentDistanceMeters + reachableMeters &&
          candidate.availableConnectors > 0
        );
      });

      const selected = reachableCandidates.sort((a, b) => {
        const distanceDifference = b.routeProgress - a.routeProgress;
        return distanceDifference !== 0 ? distanceDifference : b.maxPowerKw - a.maxPowerKw;
      })[0];

      if (!selected) {
        throw new UnprocessableEntityException({
          code: 'NO_REACHABLE_CHARGER',
          message: 'No compatible live charger is reachable before the configured reserve level',
          progressPercent: Number(((currentDistanceMeters / routeDistanceMeters) * 100).toFixed(1)),
        });
      }

      const stationDistance = selected.routeProgress * routeDistanceMeters;
      const travelledMeters = stationDistance - currentDistanceMeters;
      const arrivalSoc = Math.max(
        input.vehicle.reserveSocPercent,
        currentSoc - this.socUsed(input.vehicle, travelledMeters),
      );
      const energyAddedKwh =
        ((input.vehicle.targetChargeSocPercent - arrivalSoc) / 100) *
        input.vehicle.batteryCapacityKwh;
      const effectivePowerKw = Math.max(1, selected.maxPowerKw * 0.85);

      stops.push({
        stationId: selected.id,
        providerId: selected.providerId,
        name: selected.name,
        location: { latitude: selected.latitude, longitude: selected.longitude },
        arrivalSocPercent: Number(arrivalSoc.toFixed(1)),
        departureSocPercent: input.vehicle.targetChargeSocPercent,
        energyAddedKwh: Number(energyAddedKwh.toFixed(2)),
        estimatedChargingMinutes: Math.ceil((energyAddedKwh / effectivePowerKw) * 60),
        maxPowerKw: selected.maxPowerKw,
        liveAvailableConnectors: selected.availableConnectors,
      });

      currentDistanceMeters = stationDistance;
      currentSoc = input.vehicle.targetChargeSocPercent;
    }

    throw new UnprocessableEntityException({
      code: 'TOO_MANY_CHARGING_STOPS',
      message: 'The route requires more than ten charging stops',
    });
  }

  private rangeMeters(
    vehicle: TripPlanInput['vehicle'],
    fromSocPercent: number,
    toSocPercent: number,
  ): number {
    const usableWh = vehicle.batteryCapacityKwh * 1_000 * ((fromSocPercent - toSocPercent) / 100);
    return (usableWh / vehicle.efficiencyWhPerKm) * 1_000;
  }

  private socUsed(vehicle: TripPlanInput['vehicle'], distanceMeters: number): number {
    const energyWh = (distanceMeters / 1_000) * vehicle.efficiencyWhPerKm;
    return (energyWh / (vehicle.batteryCapacityKwh * 1_000)) * 100;
  }
}
