import { browser } from 'wxt/browser';
import type { TwitchSession } from './types';

const STORAGE_KEY = 'twitchSession';

export async function getSession(): Promise<TwitchSession | null> {
  const result = await browser.storage.session.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as TwitchSession | undefined) ?? null;
}

export async function setSession(session: TwitchSession): Promise<void> {
  await browser.storage.session.set({ [STORAGE_KEY]: session });
}

export async function clearSession(): Promise<void> {
  await browser.storage.session.remove(STORAGE_KEY);
}
