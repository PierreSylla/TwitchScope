export interface ChannelResult {
  id: string;
  login: string;
  name: string;
  game: string;
  avatarUrl: string | null;
  isLive: boolean;
  viewerCount: number | null;
}

export interface CategoryResult {
  id: string;
  name: string;
  boxArtUrl: string;
}

export type SearchMessage = { type: 'search/run'; query: string; liveOnly: boolean };

export type SearchResponse =
  | { ok: true; channels: ChannelResult[]; categories: CategoryResult[] }
  | { ok: false; error: string };
