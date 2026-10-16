import type { HelixSearchCategory, HelixSearchChannel } from '../helix/search';
import type { HelixStream } from '../helix/streams';
import { sizeBoxArt } from '../games/mapper';
import type { CategoryResult, ChannelResult } from './types';

const ROW_BOX_ART_WIDTH = 78;
const ROW_BOX_ART_HEIGHT = 104;

export function channelId(channel: HelixSearchChannel): string {
  return channel.id ?? channel.broadcaster_id ?? channel.broadcaster_login;
}

export function toChannelResults(
  channels: HelixSearchChannel[],
  liveStreams: HelixStream[],
): ChannelResult[] {
  const byUserId = new Map(liveStreams.map((s) => [s.user_id, s]));
  return channels.map((channel) => {
    const id = channelId(channel);
    const live = byUserId.get(id);
    return {
      id,
      login: channel.broadcaster_login,
      name: channel.display_name ?? channel.broadcaster_name ?? channel.broadcaster_login,
      game: channel.game_name,
      avatarUrl: channel.thumbnail_url ?? null,
      isLive: live !== undefined || channel.is_live === true,
      viewerCount: live?.viewer_count ?? null,
    };
  });
}

export function toCategoryResults(categories: HelixSearchCategory[]): CategoryResult[] {
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    boxArtUrl: sizeBoxArt(category.box_art_url, ROW_BOX_ART_WIDTH, ROW_BOX_ART_HEIGHT),
  }));
}
