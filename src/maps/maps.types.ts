export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteRequest {
  origin: Coordinate;
  destination: Coordinate;
  intermediates?: Coordinate[];
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  polyline: GeoJSON.LineString;
}

export interface RouteMatrixElement {
  originIndex: number;
  destinationIndex: number;
  distanceMeters: number;
  durationSeconds: number;
  condition: string;
}

export const ROUTES_CLIENT = Symbol('ROUTES_CLIENT');

export interface RoutesClient {
  computeRoute(request: RouteRequest): Promise<RouteResult>;
  computeMatrix(origins: Coordinate[], destinations: Coordinate[]): Promise<RouteMatrixElement[]>;
}
