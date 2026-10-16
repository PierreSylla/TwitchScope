import { describe, expect, it, vi } from 'vitest';
import type { HelixClient } from './client';
import { getTopStreams } from './streams';

function clientReturning(body: unknown): {
  client: HelixClient;
  request: ReturnType<typeof vi.fn>;
} {
  const request = vi.fn().mockResolvedValue(body);
  return { client: { request } as unknown as HelixClient, request };
}

describe('getTopStreams', () => {
  it('requests the page size and returns the pagination cursor', async () => {
    const { client, request } = clientReturning({
      data: [{ id: '1' }],
      pagination: { cursor: 'next-page' },
    });

    const page = await getTopStreams(client, { first: 20 });

    expect(request).toHaveBeenCalledWith({
      path: '/streams',
      searchParams: { first: '20', after: undefined },
    });
    expect(page).toEqual({ streams: [{ id: '1' }], cursor: 'next-page' });
  });

  it('forwards the cursor as `after` and reports no cursor on the last page', async () => {
    const { client, request } = clientReturning({ data: [], pagination: {} });

    const page = await getTopStreams(client, { first: 20, after: 'next-page' });

    expect(request).toHaveBeenCalledWith({
      path: '/streams',
      searchParams: { first: '20', after: 'next-page' },
    });
    expect(page.cursor).toBeUndefined();
  });
});
