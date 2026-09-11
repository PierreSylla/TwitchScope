export interface FollowedStreamView {
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

export type StreamsMessage = { type: 'streams/getFollowed' };

export type StreamsResponse =
  { ok: true; streams: FollowedStreamView[] } | { ok: false; error: string };
