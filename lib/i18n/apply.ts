import { browser } from 'wxt/browser';
import { getLanguage } from '@/lib/settings/storage';
import type { Language } from '@/lib/settings/types';
import { resolveLocale, setLocale } from './messages';

export function localeFor(language: Language): ReturnType<typeof resolveLocale> {
  return language === 'auto' ? resolveLocale(browser.i18n.getUILanguage()) : language;
}

export async function applyStoredLanguage(): Promise<void> {
  setLocale(localeFor(await getLanguage()));
}
