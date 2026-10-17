import type { HelixClient } from './client';

export interface HelixFollowedChannel {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  followed_at: string;
}

export interface FollowedChannelsPage {
  channels: HelixFollowedChannel[];
  cursor?: string;
}

export async function getFollowedChannels(
  client: HelixClient,
  { userId, first, after }: { userId: string; first: number; after?: string },
): Promise<FollowedChannelsPage> {
  const response = await client.request<HelixFollowedChannel>({
    path: '/channels/followed',
    searchParams: { user_id: userId, first: String(first), after },
  });
  return { channels: response.data, cursor: response.pagination?.cursor };
}
