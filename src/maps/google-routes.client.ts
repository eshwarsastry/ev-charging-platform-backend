import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/env';
import type {
  Coordinate,
  RouteMatrixElement,
  RouteRequest,
  RouteResult,
  RoutesClient,
} from './maps.types';

interface GoogleRouteResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    polyline?: { geoJsonLinestring?: GeoJSON.LineString };
  }>;
}

interface GoogleMatrixElement {
  originIndex?: number;
  destinationIndex?: number;
  distanceMeters?: number;
  duration?: string;
  condition?: string;
  status?: { code?: number; message?: string };
}

@Injectable()
export class GoogleRoutesClient implements RoutesClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  public constructor(config: ConfigService<Environment, true>) {
    this.apiKey = config.get('GOOGLE_MAPS_API_KEY', { infer: true });
    this.baseUrl = config.get('GOOGLE_ROUTES_BASE_URL', { infer: true }).replace(/\/$/, '');
  }

  public async computeRoute(request: RouteRequest): Promise<RouteResult> {
    const response = await fetch(`${this.baseUrl}/directions/v2:computeRoutes`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': this.apiKey,
        'x-goog-fieldmask':
          'routes.distanceMeters,routes.duration,routes.polyline.geoJsonLinestring',
      },
      body: JSON.stringify({
        origin: this.toWaypoint(request.origin),
        destination: this.toWaypoint(request.destination),
        intermediates: request.intermediates?.map((point) => this.toWaypoint(point)),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        polylineEncoding: 'GEO_JSON_LINESTRING',
        polylineQuality: 'HIGH_QUALITY',
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new BadGatewayException({
        code: 'GOOGLE_ROUTES_ERROR',
        status: response.status,
        message: await this.safeError(response),
      });
    }

    const payload = (await response.json()) as GoogleRouteResponse;
    const route = payload.routes?.[0];
    if (!route?.distanceMeters || !route.duration || !route.polyline?.geoJsonLinestring) {
      throw new BadGatewayException('Google Routes returned no usable driving route');
    }

    return {
      distanceMeters: route.distanceMeters,
      durationSeconds: this.parseDuration(route.duration),
      polyline: route.polyline.geoJsonLinestring,
    };
  }

  public async computeMatrix(
    origins: Coordinate[],
    destinations: Coordinate[],
  ): Promise<RouteMatrixElement[]> {
    const response = await fetch(`${this.baseUrl}/distanceMatrix/v2:computeRouteMatrix`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': this.apiKey,
        'x-goog-fieldmask': 'originIndex,destinationIndex,status,condition,distanceMeters,duration',
      },
      body: JSON.stringify({
        origins: origins.map((origin) => ({ waypoint: this.toWaypoint(origin) })),
        destinations: destinations.map((destination) => ({
          waypoint: this.toWaypoint(destination),
        })),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new BadGatewayException({
        code: 'GOOGLE_ROUTE_MATRIX_ERROR',
        status: response.status,
        message: await this.safeError(response),
      });
    }

    const payload = (await response.json()) as GoogleMatrixElement[];
    return payload
      .filter((element) => (element.status?.code ?? 0) === 0)
      .map((element) => ({
        originIndex: element.originIndex ?? 0,
        destinationIndex: element.destinationIndex ?? 0,
        distanceMeters: element.distanceMeters ?? 0,
        durationSeconds: this.parseDuration(element.duration ?? '0s'),
        condition: element.condition ?? 'ROUTE_NOT_FOUND',
      }));
  }

  private toWaypoint(point: Coordinate): object {
    return {
      location: {
        latLng: { latitude: point.latitude, longitude: point.longitude },
      },
    };
  }

  private parseDuration(value: string): number {
    return Number.parseFloat(value.replace(/s$/, ''));
  }

  private async safeError(response: Response): Promise<string> {
    const text = await response.text();
    return text.slice(0, 1_000);
  }
}
