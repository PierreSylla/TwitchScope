import { describe, expect, it } from 'vitest';
import { toCategoryResults, toChannelResults } from './mapper';
import type { HelixSearchChannel } from '../helix/search';
import type { HelixStream } from '../helix/streams';

function channel(overrides: Partial<HelixSearchChannel> = {}): HelixSearchChannel {
  return {
    id: 'u1',
    broadcaster_login: 'alice',
    display_name: 'AlicePlays',
    game_id: 'g1',
    game_name: 'Test Game',
    title: 'A title',
    ...overrides,
  };
}

function stream(userId: string, viewers: number): HelixStream {
  return {
    id: 's1',
    user_id: userId,
    user_login: 'alice',
    user_name: 'AlicePlays',
    game_id: 'g1',
    game_name: 'Test Game',
    type: 'live',
    title: 'A title',
    viewer_count: viewers,
    started_at: new Date().toISOString(),
    thumbnail_url: 'https://x/{width}x{height}.jpg',
  };
}

describe('toChannelResults', () => {
  it('attaches viewer counts to channels found in the live streams', () => {
    const [result] = toChannelResults([channel()], [stream('u1', 4321)]);
    expect(result).toMatchObject({ id: 'u1', name: 'AlicePlays', isLive: true, viewerCount: 4321 });
  });

  it('marks a channel offline with no count when it is not among the live streams', () => {
    const [result] = toChannelResults([channel()], []);
    expect(result).toMatchObject({ isLive: false, viewerCount: null });
  });

  it('still trusts is_live when the streams lookup returns nothing', () => {
    const [result] = toChannelResults([channel({ is_live: true })], []);
    expect(result).toMatchObject({ isLive: true, viewerCount: null });
  });

  it('accepts the broadcaster_* field spelling as well', () => {
    const [result] = toChannelResults(
      [
        {
          broadcaster_id: 'u9',
          broadcaster_login: 'bob',
          broadcaster_name: 'BobPlays',
          game_id: 'g',
          game_name: 'G',
          title: 'T',
        },
      ],
      [stream('u9', 7)],
    );
    expect(result).toMatchObject({ id: 'u9', name: 'BobPlays', viewerCount: 7 });
  });
});

describe('toCategoryResults', () => {
  it('sizes box art for a small row thumbnail', () => {
    expect(
      toCategoryResults([
        { id: '1', name: 'Dota 2', box_art_url: 'https://x/{width}x{height}.jpg' },
      ]),
    ).toEqual([{ id: '1', name: 'Dota 2', boxArtUrl: 'https://x/78x104.jpg' }]);
  });
});
