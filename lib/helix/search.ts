import type { HelixClient } from './client';

export interface HelixSearchChannel {
  id?: string;
  broadcaster_id?: string;
  broadcaster_login: string;
  display_name?: string;
  broadcaster_name?: string;
  game_id: string;
  game_name: string;
  title: string;
  is_live?: boolean;
  thumbnail_url?: string;
}

export interface HelixSearchCategory {
  id: string;
  name: string;
  box_art_url: string;
}

export async function searchChannels(
  client: HelixClient,
  { query, liveOnly, first }: { query: string; liveOnly: boolean; first: number },
): Promise<HelixSearchChannel[]> {
  const response = await client.request<HelixSearchChannel>({
    path: '/search/channels',
    searchParams: { query, first: String(first), live_only: liveOnly ? 'true' : undefined },
  });
  return response.data;
}

export async function searchCategories(
  client: HelixClient,
  { query, first }: { query: string; first: number },
): Promise<HelixSearchCategory[]> {
  const response = await client.request<HelixSearchCategory>({
    path: '/search/categories',
    searchParams: { query, first: String(first) },
  });
  return response.data;
}
