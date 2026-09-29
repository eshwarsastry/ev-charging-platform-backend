import { afterEach, describe, expect, it, vi } from 'vitest';
import { OcpiClient } from '../src/providers/ocpi.client';
const config = {
  id: 'test',
  displayName: 'Test',
  enabled: true,
  baseUrl: 'https://vendor.example/ocpi',
  token: 'secret',
};
const page = (id: string, link?: string) =>
  new Response(JSON.stringify({ status_code: 1000, data: [{ id }] }), {
    headers: link ? { link } : {},
  });
afterEach(() => vi.unstubAllGlobals());
describe('OCPI pagination', () => {
  it('follows the next link even for a short page', async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(
        page('1', '<https://vendor.example/ocpi/locations?offset=1>; rel="next"'),
      )
      .mockResolvedValueOnce(page('2'));
    vi.stubGlobal('fetch', mock);
    expect(await new OcpiClient(config).getLocations()).toEqual([{ id: '1' }, { id: '2' }]);
    expect(mock).toHaveBeenCalledTimes(2);
  });
  it.each([
    'https://attacker.example/steal',
    'https://vendor.example/ocpi/locations?offset=0&limit=100',
  ])('refuses unsafe or looping next links', async (link) => {
    const mock = vi.fn().mockResolvedValue(page('1', `<${link}>; rel="next"`));
    vi.stubGlobal('fetch', mock);
    await expect(new OcpiClient(config).getLocations()).rejects.toThrow('pagination');
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it('rejects a malformed payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }))));
    await expect(new OcpiClient(config).getLocations()).rejects.toThrow();
  });
});
