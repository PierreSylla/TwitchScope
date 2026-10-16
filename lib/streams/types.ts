export interface StreamView {
  id: string;
  channel: string;
  login: string;
  game: string;
  title: string;
  viewerCount: number;
  startedAt: string;
  thumbnailUrl: string;
  avatarUrl: string | null;
}

export type StreamsMessage =
  | { type: 'streams/getFollowed' }
  | { type: 'streams/getTop'; cursor?: string }
  | { type: 'streams/getByGame'; gameId: string; cursor?: string };

export type StreamsResponse =
  { ok: true; streams: StreamView[]; cursor?: string } | { ok: false; error: string };
