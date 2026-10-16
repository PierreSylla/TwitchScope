import { describe, expect, it } from 'vitest';
import { isFresh, type FollowedCache } from './cache';

const cache = (fetchedAt: number): FollowedCache => ({ streams: [], fetchedAt });

describe('isFresh', () => {
  const now = 1_000_000_000_000;

  it('accepts a cache written just now', () => {
    expect(isFresh(cache(now), now)).toBe(true);
  });

  it('accepts a cache inside the ten-minute window', () => {
    expect(isFresh(cache(now - 9 * 60_000), now)).toBe(true);
  });

  it('rejects a cache past the window', () => {
    expect(isFresh(cache(now - 11 * 60_000), now)).toBe(false);
  });

  it('rejects a timestamp from the future, which means a changed clock', () => {
    expect(isFresh(cache(now + 60_000), now)).toBe(false);
  });
});
