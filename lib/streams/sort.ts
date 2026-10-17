import type { StreamView } from './types';

export type SortKey = 'viewers' | 'name' | 'game' | 'duration';

export const SORT_KEYS = ['viewers', 'name', 'game', 'duration'] as const;

export const DEFAULT_SORT: SortKey = 'viewers';

export const ALL_GAMES = '';

export function gameOptions(streams: StreamView[], locale = 'en'): string[] {
  const games = new Set(streams.map((s) => s.game).filter((game) => game !== ''));
  return [...games].sort(new Intl.Collator(locale).compare);
}

export function sortStreams(streams: StreamView[], key: SortKey, locale = 'en'): StreamView[] {
  const byName = new Intl.Collator(locale, { sensitivity: 'base' }).compare;
  const byViewers = (a: StreamView, b: StreamView) => b.viewerCount - a.viewerCount;
  const sorted = [...streams];
  switch (key) {
    case 'viewers':
      return sorted.sort(byViewers);
    case 'name':
      return sorted.sort((a, b) => byName(a.channel, b.channel));
    case 'game':
      return sorted.sort((a, b) => byName(a.game, b.game) || byViewers(a, b));
    case 'duration':
      // Longest live first, so the earliest start wins.
      return sorted.sort(
        (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
      );
  }
}

export function filterByGame(streams: StreamView[], game: string): StreamView[] {
  return game === ALL_GAMES ? streams : streams.filter((s) => s.game === game);
}
