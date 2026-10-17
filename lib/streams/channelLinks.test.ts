import { describe, expect, it } from 'vitest';
import { CHANNEL_ACTIONS, channelUrl } from './channelLinks';

describe('channelUrl', () => {
  it('builds every action for a channel', () => {
    expect(CHANNEL_ACTIONS.map((action) => channelUrl(action, 'novaplays'))).toEqual([
      'https://www.twitch.tv/novaplays',
      'https://player.twitch.tv/?channel=novaplays&parent=twitch.tv',
      'https://multitwitch.tv/novaplays',
      'https://www.twitch.tv/popout/novaplays/chat',
      'https://www.twitch.tv/novaplays/videos',
    ]);
  });

  it('escapes anything unexpected in a login', () => {
    expect(channelUrl('newTab', 'a/b?c')).toBe('https://www.twitch.tv/a%2Fb%3Fc');
  });

  it('covers every declared action', () => {
    expect(CHANNEL_ACTIONS).toHaveLength(5);
    for (const action of CHANNEL_ACTIONS) {
      expect(channelUrl(action, 'x')).toMatch(/^https:\/\//);
    }
  });
});
