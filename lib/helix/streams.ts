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
