import { describe, expect, it, vi } from 'vitest';
import { createHelixClient } from './client';
import { HelixAuthError } from './types';

describe('createHelixClient', () => {
  it('throws HelixAuthError when no access token is available', async () => {
    const client = createHelixClient({ getAccessToken: async () => null });

    await expect(client.request({ path: '/users' })).rejects.toBeInstanceOf(HelixAuthError);
  });

  it('throws HelixAuthError and calls onUnauthorized on a 401 response', async () => {
    const onUnauthorized = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    const client = createHelixClient({
      getAccessToken: async () => 'sometoken',
      onUnauthorized,
    });

    await expect(client.request({ path: '/users' })).rejects.toBeInstanceOf(HelixAuthError);
    expect(onUnauthorized).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });

  it('retries once on 429 then returns the successful response', async () => {
    const resetAt = Math.floor(Date.now() / 1000);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 429, headers: { 'Ratelimit-Reset': String(resetAt) } }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = createHelixClient({ getAccessToken: async () => 'sometoken' });
    const result = await client.request({ path: '/users' });

    expect(result).toEqual({ data: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });
});
