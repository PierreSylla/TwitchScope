import { browser } from 'wxt/browser';
import {
  DEFAULT_DENSITY,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_THEME,
  type Density,
  type NotificationSettings,
  type Theme,
} from './types';

export const DENSITY_KEY = 'density';
export const THEME_KEY = 'theme';
export const NOTIFICATIONS_KEY = 'notifications';

export async function getDensity(): Promise<Density> {
  const result = await browser.storage.sync.get(DENSITY_KEY);
  return (result[DENSITY_KEY] as Density | undefined) ?? DEFAULT_DENSITY;
}

export async function setDensity(density: Density): Promise<void> {
  await browser.storage.sync.set({ [DENSITY_KEY]: density });
}

export async function getTheme(): Promise<Theme> {
  const result = await browser.storage.sync.get(THEME_KEY);
  return (result[THEME_KEY] as Theme | undefined) ?? DEFAULT_THEME;
}

export async function setTheme(theme: Theme): Promise<void> {
  await browser.storage.sync.set({ [THEME_KEY]: theme });
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const result = await browser.storage.sync.get(NOTIFICATIONS_KEY);
  const stored = result[NOTIFICATIONS_KEY] as Partial<NotificationSettings> | undefined;
  return { ...DEFAULT_NOTIFICATION_SETTINGS, ...stored };
}

export async function setNotificationSettings(next: NotificationSettings): Promise<void> {
  await browser.storage.sync.set({ [NOTIFICATIONS_KEY]: next });
}
