import type { HelixClient } from './client';

export interface HelixGame {
  id: string;
  name: string;
  box_art_url: string;
}

export interface TopGamesPage {
  games: HelixGame[];
  cursor?: string;
}

export async function getTopGames(
  client: HelixClient,
  { first, after }: { first: number; after?: string },
): Promise<TopGamesPage> {
  const response = await client.request<HelixGame>({
    path: '/games/top',
    searchParams: { first: String(first), after },
  });
  return { games: response.data, cursor: response.pagination?.cursor };
}
