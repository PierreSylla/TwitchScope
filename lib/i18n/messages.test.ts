import { describe, expect, it } from 'vitest';
import { currentLocale, resolveLocale, setLocale, t, tCount } from './messages';

describe('resolveLocale', () => {
  it('narrows a regional tag to a locale we ship', () => {
    expect(resolveLocale('fr-FR')).toBe('fr');
    expect(resolveLocale('en-GB')).toBe('en');
  });

  it('falls back to English for anything else', () => {
    expect(resolveLocale('de-DE')).toBe('en');
    expect(resolveLocale('')).toBe('en');
  });
});

describe('t', () => {
  it('returns the string for the active locale', () => {
    setLocale('fr');
    expect(t('tabFollowed')).toBe('Suivis');
    setLocale('en');
    expect(t('tabFollowed')).toBe('Followed');
  });

  it('substitutes a positional placeholder', () => {
    setLocale('en');
    expect(t('notificationLiveTitle', ['NovaPlays'])).toBe('NovaPlays is live');
  });

  it('leaves an empty placeholder rather than printing undefined', () => {
    setLocale('en');
    expect(t('notificationLiveTitle', [])).toBe(' is live');
  });
});

describe('tCount', () => {
  it('uses the singular at one and the plural above, in French', () => {
    setLocale('fr');
    expect(tCount('streamViewers', 1)).toBe('1 spectateur');
    expect(tCount('streamViewers', 2)).toBe('2 spectateurs');
  });

  it('follows the French rule that zero is singular, unlike English', () => {
    setLocale('fr');
    expect(tCount('streamViewers', 0)).toBe('0 spectateur');
    setLocale('en');
    expect(tCount('streamViewers', 0)).toBe('0 viewers');
  });

  it('does the same in English', () => {
    setLocale('en');
    expect(tCount('streamViewers', 1)).toBe('1 viewer');
    expect(tCount('streamViewers', 4)).toBe('4 viewers');
  });

  it('shows a formatted count while choosing the form from the number', () => {
    setLocale('fr');
    expect(tCount('streamViewers', 1234, '1 234')).toBe('1 234 spectateurs');
  });

  it('covers the announcement keys too', () => {
    setLocale('fr');
    expect(tCount('followedLoadedAnnouncement', 1)).toBe('1 chaîne en direct');
    expect(tCount('followedLoadedAnnouncement', 3)).toBe('3 chaînes en direct');
  });
});

describe('setLocale', () => {
  it('reports the active locale', () => {
    setLocale('fr');
    expect(currentLocale()).toBe('fr');
    setLocale('en');
    expect(currentLocale()).toBe('en');
  });
});
