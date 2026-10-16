import { browser } from 'wxt/browser';
import type { Density } from './types';

export const DENSITY_OPTIONS: readonly { value: Density; label: string }[] = [
  { value: 'compact', label: browser.i18n.getMessage('settingsDensityCompact') },
  { value: 'comfortable', label: browser.i18n.getMessage('settingsDensityComfortable') },
];

export function intervalLabel(minutes: number): string {
  return browser.i18n.getMessage('settingsNotificationsEveryMinutes', [String(minutes)]);
}
