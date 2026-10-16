import { describe, expect, it } from 'vitest';
import { newlyLive } from './liveSet';
import type { StreamView } from './types';

function stream(login: string, id = `stream-${login}`): StreamView {
  return {
    id,
    channel: login.toUpperCase(),
    login,
    game: 'Game',
    title: 'Title',
    viewerCount: 1,
    startedAt: new Date().toISOString(),
    thumbnailUrl: 'https://example.invalid/t.jpg',
    avatarUrl: null,
  };
}

describe('newlyLive', () => {
  it('returns nothing when there is no baseline yet', () => {
    expect(newlyLive(null, [stream('alice'), stream('bob')])).toEqual([]);
  });

  it('returns only channels absent from the baseline', () => {
    const result = newlyLive(['alice'], [stream('alice'), stream('bob')]);
    expect(result.map((s) => s.login)).toEqual(['bob']);
  });

  it('ignores a new stream id for a channel that was already live', () => {
    const result = newlyLive(['alice'], [stream('alice', 'restarted-broadcast')]);
    expect(result).toEqual([]);
  });

  it('returns nothing when nobody new is live, including when channels went offline', () => {
    expect(newlyLive(['alice', 'bob'], [stream('alice')])).toEqual([]);
    expect(newlyLive(['alice'], [])).toEqual([]);
  });

  it('treats an empty baseline as "nobody was live", so every channel is new', () => {
    const result = newlyLive([], [stream('alice'), stream('bob')]);
    expect(result.map((s) => s.login)).toEqual(['alice', 'bob']);
  });
});
