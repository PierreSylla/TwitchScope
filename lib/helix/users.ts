import type { HelixClient } from './client';

export interface HelixUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
}

export async function getUsersByIds(client: HelixClient, ids: string[]): Promise<HelixUser[]> {
  if (ids.length === 0) return [];
  const response = await client.request<HelixUser>({
    path: '/users',
    searchParams: { id: ids },
  });
  return response.data;
}
