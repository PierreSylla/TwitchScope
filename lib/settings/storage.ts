import { browser } from 'wxt/browser';
import {
  DEFAULT_DENSITY,
  DEFAULT_NOTIFICATION_SETTINGS,
  type Density,
  type NotificationSettings,
} from './types';

export const DENSITY_KEY = 'density';
export const NOTIFICATIONS_KEY = 'notifications';

export async function getDensity(): Promise<Density> {
  const result = await browser.storage.sync.get(DENSITY_KEY);
  return (result[DENSITY_KEY] as Density | undefined) ?? DEFAULT_DENSITY;
}

export async function setDensity(density: Density): Promise<void> {
  await browser.storage.sync.set({ [DENSITY_KEY]: density });
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const result = await browser.storage.sync.get(NOTIFICATIONS_KEY);
  const stored = result[NOTIFICATIONS_KEY] as Partial<NotificationSettings> | undefined;
  return { ...DEFAULT_NOTIFICATION_SETTINGS, ...stored };
}

export async function setNotificationSettings(next: NotificationSettings): Promise<void> {
  await browser.storage.sync.set({ [NOTIFICATIONS_KEY]: next });
}
