export type NormalizedConnectorStatus =
  'AVAILABLE' | 'CHARGING' | 'OCCUPIED' | 'RESERVED' | 'OUTOFORDER' | 'INOPERATIVE' | 'UNKNOWN';

export interface NormalizedConnector {
  externalId: string;
  standard: string;
  format?: string;
  powerType?: string;
  maxVoltage?: number;
  maxAmperage?: number;
  maxElectricPowerWatts?: number;
  tariffIds?: string[];
  lastUpdated?: Date;
}

export interface NormalizedEvse {
  externalUid: string;
  status: NormalizedConnectorStatus;
  floorLevel?: string;
  lastUpdated?: Date;
  connectors: NormalizedConnector[];
}

export interface NormalizedStation {
  externalId: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  isPublic: boolean;
  evses: NormalizedEvse[];
  raw: unknown;
}

export interface StationCandidate {
  id: string;
  providerId: string;
  externalId: string;
  name: string;
  latitude: number;
  longitude: number;
  routeProgress: number;
  distanceFromRouteMeters: number;
  availableConnectors: number;
  maxPowerKw: number;
  connectorStandards: string[];
}
