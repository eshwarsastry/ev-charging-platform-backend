import { afterEach, describe, expect, it, vi } from 'vitest';
import { OcpiClient } from '../src/providers/ocpi.client';

afterEach(() => vi.unstubAllGlobals());

describe('OcpiClient', () => {
  it('reads OCPI locations using token authentication', async () => {
    const fetchMock = vi
      .fn<(input: string | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'LOC-1',
                coordinates: { latitude: '12.9716', longitude: '77.5946' },
                evses: [],
              },
            ],
            status_code: 1000,
            timestamp: new Date().toISOString(),
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const locations = await new OcpiClient({
      id: 'ionage',
      displayName: 'IONAGE',
      enabled: true,
      baseUrl: 'https://sandbox.example.test/ocpi/2.2.1',
      token: 'secret-token',
    }).getLocations();

    expect(locations).toHaveLength(1);
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit?.headers).toMatchObject({ authorization: 'Token secret-token' });
  });

  it('does not make a request when a provider is disabled', async () => {
    const fetchMock = vi.fn<(input: string | URL, init?: RequestInit) => Promise<Response>>();
    vi.stubGlobal('fetch', fetchMock);
    const locations = await new OcpiClient({
      id: 'pulse-energy',
      displayName: 'Pulse Energy',
      enabled: false,
    }).getLocations();
    expect(locations).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
