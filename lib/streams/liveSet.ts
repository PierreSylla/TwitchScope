import { browser } from 'wxt/browser';
import type { StreamView } from './types';

const LIVE_SET_KEY = 'liveChannelLogins';

export function newlyLive(previous: string[] | null, current: StreamView[]): StreamView[] {
  if (previous === null) return [];
  const before = new Set(previous);
  return current.filter((stream) => !before.has(stream.login));
}

export async function getLiveBaseline(): Promise<string[] | null> {
  const stored = await browser.storage.session.get(LIVE_SET_KEY);
  const logins = stored[LIVE_SET_KEY] as string[] | undefined;
  return logins ?? null;
}

export async function setLiveBaseline(streams: StreamView[]): Promise<void> {
  await browser.storage.session.set({ [LIVE_SET_KEY]: streams.map((s) => s.login) });
}

export async function clearLiveBaseline(): Promise<void> {
  await browser.storage.session.remove(LIVE_SET_KEY);
}
