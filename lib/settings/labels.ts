import { t } from '@/lib/i18n/messages';
import type { Density, Language, Theme } from './types';

export function densityOptions(): { value: Density; label: string }[] {
  return [
    { value: 'compact', label: t('settingsDensityCompact') },
    { value: 'comfortable', label: t('settingsDensityComfortable') },
  ];
}

export function themeOptions(): { value: Theme; label: string }[] {
  return [
    { value: 'auto', label: t('settingsThemeAuto') },
    { value: 'light', label: t('settingsThemeLight') },
    { value: 'dark', label: t('settingsThemeDark') },
  ];
}

export function languageOptions(): { value: Language; label: string }[] {
  return [
    { value: 'auto', label: t('settingsLanguageAuto') },
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'English' },
  ];
}

export function intervalLabel(minutes: number): string {
  return t('settingsNotificationsEveryMinutes', [String(minutes)]);
}
