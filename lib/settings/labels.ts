import { browser } from 'wxt/browser';
import type { Density, Theme } from './types';

export const DENSITY_OPTIONS: readonly { value: Density; label: string }[] = [
  { value: 'compact', label: browser.i18n.getMessage('settingsDensityCompact') },
  { value: 'comfortable', label: browser.i18n.getMessage('settingsDensityComfortable') },
];

export const THEME_OPTIONS: readonly { value: Theme; label: string }[] = [
  { value: 'auto', label: browser.i18n.getMessage('settingsThemeAuto') },
  { value: 'light', label: browser.i18n.getMessage('settingsThemeLight') },
  { value: 'dark', label: browser.i18n.getMessage('settingsThemeDark') },
];

export function intervalLabel(minutes: number): string {
  return browser.i18n.getMessage('settingsNotificationsEveryMinutes', [String(minutes)]);
}
