import type { HelixStream } from '../helix/streams';
import type { HelixUser } from '../helix/users';
import type { StreamView } from './types';

const THUMBNAIL_WIDTH = 440;
const THUMBNAIL_HEIGHT = 248;

export function sizeThumbnail(url: string): string {
  return url
    .replace('{width}', String(THUMBNAIL_WIDTH))
    .replace('{height}', String(THUMBNAIL_HEIGHT));
}

export function toStreamViews(
  streams: HelixStream[],
  usersById: Map<string, HelixUser>,
): StreamView[] {
  return streams
    .map((s) => ({
      id: s.id,
      userId: s.user_id,
      channel: s.user_name,
      login: s.user_login,
      game: s.game_name,
      title: s.title,
      viewerCount: s.viewer_count,
      startedAt: s.started_at,
      thumbnailUrl: sizeThumbnail(s.thumbnail_url),
      avatarUrl: usersById.get(s.user_id)?.profile_image_url ?? null,
    }))
    .sort((a, b) => b.viewerCount - a.viewerCount);
}
