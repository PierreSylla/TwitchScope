import { describe, expect, it } from 'vitest';
import { filterByGame, gameOptions, sortStreams } from './sort';
import type { StreamView } from './types';

function stream(partial: Partial<StreamView> & { login: string }): StreamView {
  return {
    id: `s-${partial.login}`,
    userId: `u-${partial.login}`,
    channel: partial.login,
    game: 'Game',
    title: 'Title',
    viewerCount: 0,
    startedAt: '2026-10-17T12:00:00Z',
    thumbnailUrl: '',
    avatarUrl: null,
    ...partial,
  };
}

const streams = [
  stream({
    login: 'bravo',
    channel: 'Bravo',
    game: 'Zelda',
    viewerCount: 50,
    startedAt: '2026-10-17T10:00:00Z',
  }),
  stream({
    login: 'alpha',
    channel: 'alpha',
    game: 'Mario',
    viewerCount: 500,
    startedAt: '2026-10-17T11:00:00Z',
  }),
  stream({
    login: 'delta',
    channel: 'Delta',
    game: 'Mario',
    viewerCount: 100,
    startedAt: '2026-10-17T08:00:00Z',
  }),
];

describe('sortStreams', () => {
  it('sorts by viewers descending', () => {
    expect(sortStreams(streams, 'viewers').map((s) => s.login)).toEqual([
      'alpha',
      'delta',
      'bravo',
    ]);
  });

  it('sorts by channel name, ignoring case', () => {
    expect(sortStreams(streams, 'name').map((s) => s.login)).toEqual(['alpha', 'bravo', 'delta']);
  });

  it('sorts by game, then by viewers inside a game', () => {
    expect(sortStreams(streams, 'game').map((s) => s.login)).toEqual(['alpha', 'delta', 'bravo']);
  });

  it('sorts by duration with the longest-running stream first', () => {
    expect(sortStreams(streams, 'duration').map((s) => s.login)).toEqual([
      'delta',
      'bravo',
      'alpha',
    ]);
  });

  it('never mutates the array it was given', () => {
    const original = [...streams];
    sortStreams(streams, 'name');
    expect(streams).toEqual(original);
  });
});

describe('gameOptions', () => {
  it('lists each game once, sorted, skipping streams with no game', () => {
    const withBlank = [...streams, stream({ login: 'echo', game: '' })];
    expect(gameOptions(withBlank)).toEqual(['Mario', 'Zelda']);
  });
});

describe('filterByGame', () => {
  it('keeps only the chosen game', () => {
    expect(filterByGame(streams, 'Mario').map((s) => s.login)).toEqual(['alpha', 'delta']);
  });

  it('keeps everything when no game is chosen', () => {
    expect(filterByGame(streams, '')).toHaveLength(3);
  });
});
