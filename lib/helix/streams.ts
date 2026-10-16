import type { HelixClient } from './client';

export interface HelixStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  thumbnail_url: string;
}

export async function getFollowedStreams(
  client: HelixClient,
  userId: string,
): Promise<HelixStream[]> {
  const response = await client.request<HelixStream>({
    path: '/streams/followed',
    searchParams: { user_id: userId, first: '100' },
  });
  return response.data;
}

export interface TopStreamsPage {
  streams: HelixStream[];
  cursor?: string;
}

export async function getTopStreams(
  client: HelixClient,
  { first, after, gameId }: { first: number; after?: string; gameId?: string },
): Promise<TopStreamsPage> {
  const response = await client.request<HelixStream>({
    path: '/streams',
    searchParams: { first: String(first), after, game_id: gameId },
  });
  return { streams: response.data, cursor: response.pagination?.cursor };
}

export async function getStreamsByUserIds(
  client: HelixClient,
  userIds: string[],
): Promise<HelixStream[]> {
  if (userIds.length === 0) return [];
  const response = await client.request<HelixStream>({
    path: '/streams',
    searchParams: { user_id: userIds, first: String(userIds.length) },
  });
  return response.data;
}
