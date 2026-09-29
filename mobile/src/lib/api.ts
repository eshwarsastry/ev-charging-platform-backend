export const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

export interface Connector {
  id: string;
  standard: string;
  status: string;
  power_kw: number;
  last_updated?: string;
}
export interface Station {
  id: string;
  provider_id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  distance_meters?: number;
  available_connectors?: number;
  max_power_kw?: number;
  connector_standards?: string[];
  updated_at?: string;
  connectors?: Connector[];
}
export interface Provider {
  id: string;
  displayName: string;
  configured: boolean;
}
export interface Capabilities {
  paymentSandbox: boolean;
  livePayments: boolean;
  message: string;
}
export interface Receipt {
  sandbox: boolean;
  status: string;
  tagStatus: string;
  amountPaise: number;
  energyWh: number;
  reference?: string;
  message: string;
}

export async function request<T>(path: string, body?: unknown): Promise<T> {
  if (!API_URL) throw new Error('Connect a backend with EXPO_PUBLIC_API_URL to use this feature.');
  if (!__DEV__ && !API_URL.startsWith('https://'))
    throw new Error('Release builds require an HTTPS backend.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(
        `The service could not complete your request (${response.status}). Please try again.`,
      );
    return (await response.json()) as T;
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error('The service took too long to respond. Please try again.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const connectorLabel = (value: string) =>
  ({ IEC_62196_T2_COMBO: 'CCS2', IEC_62196_T2: 'Type 2', CHADEMO: 'CHAdeMO' })[value] || value;
export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';
