export interface OcpiResponse<T> {
  data: T;
  status_code: number;
  status_message?: string;
  timestamp: string;
}

export interface OcpiConnector {
  id: string;
  standard: string;
  format?: string;
  power_type?: string;
  max_voltage?: number;
  max_amperage?: number;
  max_electric_power?: number;
  tariff_ids?: string[];
  last_updated?: string;
}

export interface OcpiEvse {
  uid: string;
  status: string;
  floor_level?: string;
  connectors: OcpiConnector[];
  last_updated?: string;
}

export interface OcpiLocation {
  publish?: boolean;
  id: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  coordinates: { latitude: string; longitude: string };
  parking_type?: string;
  evses?: OcpiEvse[];
  last_updated?: string;
}

export interface ProviderConfiguration {
  id: string;
  displayName: string;
  enabled: boolean;
  baseUrl?: string;
  token?: string;
}
