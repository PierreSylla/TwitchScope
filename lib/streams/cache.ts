import { browser } from 'wxt/browser';
import type { StreamView } from './types';

export const FOLLOWED_CACHE_KEY = 'followedCache';

const MAX_AGE_MS = 10 * 60 * 1000;

export interface FollowedCache {
  streams: StreamView[];
  fetchedAt: number;
}

export function isFresh(cache: FollowedCache, now = Date.now()): boolean {
  const age = now - cache.fetchedAt;
  return age >= 0 && age <= MAX_AGE_MS;
}

export async function getFollowedCache(now = Date.now()): Promise<FollowedCache | null> {
  const stored = await browser.storage.session.get(FOLLOWED_CACHE_KEY);
  const cache = stored[FOLLOWED_CACHE_KEY] as FollowedCache | undefined;
  if (!cache || !Array.isArray(cache.streams)) return null;
  return isFresh(cache, now) ? cache : null;
}

export async function setFollowedCache(streams: StreamView[]): Promise<void> {
  const cache: FollowedCache = { streams, fetchedAt: Date.now() };
  await browser.storage.session.set({ [FOLLOWED_CACHE_KEY]: cache });
}

export async function clearFollowedCache(): Promise<void> {
  await browser.storage.session.remove(FOLLOWED_CACHE_KEY);
}
