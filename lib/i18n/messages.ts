import en from '../../public/_locales/en/messages.json';
import fr from '../../public/_locales/fr/messages.json';

export type Locale = 'en' | 'fr';
export type MessageKey = keyof typeof en;

interface Entry {
  message: string;
  placeholders?: Record<string, { content: string }>;
}

const CATALOGUES: Record<Locale, Record<string, Entry>> = { en, fr };
export const LOCALES: readonly Locale[] = ['en', 'fr'];

let current: Locale = 'en';

export function setLocale(locale: Locale): void {
  current = locale;
}

export function currentLocale(): Locale {
  return current;
}

/** Narrows a browser language tag such as `fr-FR` to a locale we ship. */
export function resolveLocale(tag: string): Locale {
  const base = tag.toLowerCase().split('-')[0];
  return LOCALES.find((locale) => locale === base) ?? 'en';
}

function lookup(key: string): Entry | undefined {
  return CATALOGUES[current][key] ?? CATALOGUES.en[key];
}

function fill(entry: Entry, substitutions: readonly string[]): string {
  let message = entry.message;
  for (const [name, { content }] of Object.entries(entry.placeholders ?? {})) {
    const index = Number(content.slice(1)) - 1;
    const value = substitutions[index] ?? '';
    message = message.replaceAll(`$${name.toUpperCase()}$`, value);
  }
  return message;
}

export function t(key: MessageKey, substitutions: readonly string[] = []): string {
  const entry = lookup(key);
  return entry ? fill(entry, substitutions) : key;
}

/**
 * Picks the `_one` / `_other` variant of `key` for `count`, so "1 viewer" does
 * not come out as "1 viewers" in either language.
 */
type BaseOf<K> = K extends `${infer B}_other` ? B : never;

/** Keys that ship a `_one` / `_other` pair. */
export type CountKey = BaseOf<MessageKey>;

export function tCount(key: CountKey, count: number, display: string = String(count)): string {
  const category = new Intl.PluralRules(current).select(count);
  const entry = lookup(`${key}_${category}`) ?? lookup(`${key}_other`);
  return entry ? fill(entry, [display]) : key;
}
