import { useEffect, useState } from 'react';
import { browser, type Browser } from 'wxt/browser';
import { sendMessage } from '@/lib/messaging';
import type { StreamsMessage, StreamsResponse, StreamView } from '@/lib/streams/types';
import type { Density } from '@/lib/settings/types';
import { FOLLOWED_CACHE_KEY, getFollowedCache, type FollowedCache } from '@/lib/streams/cache';
import {
  ALL_GAMES,
  DEFAULT_SORT,
  filterByGame,
  gameOptions,
  SORT_KEYS,
  sortStreams,
  type SortKey,
} from '@/lib/streams/sort';
import StreamCard from './StreamCard';
import { StreamEmpty, StreamError, StreamList, StreamSkeleton } from './StreamStates';

const SORT_MESSAGE: Record<SortKey, 'sortViewers' | 'sortName' | 'sortGame' | 'sortDuration'> = {
  viewers: 'sortViewers',
  name: 'sortName',
  game: 'sortGame',
  duration: 'sortDuration',
};

type State =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'empty' }
  | { kind: 'loaded'; streams: StreamView[] };

interface FollowedViewProps {
  density: Density;
  onDisconnected: () => void;
}

function FollowedView({ density, onDisconnected }: FollowedViewProps) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [game, setGame] = useState<string>(ALL_GAMES);

  async function load() {
    const res = await sendMessage<StreamsResponse>({
      type: 'streams/getFollowed',
    } satisfies StreamsMessage);
    if (!res.ok) {
      if (res.error === 'not_connected') onDisconnected();
      else setState((prev) => (prev.kind === 'loaded' ? prev : { kind: 'error' }));
      return;
    }
    setState(
      res.streams.length === 0 ? { kind: 'empty' } : { kind: 'loaded', streams: res.streams },
    );
  }

  function retry() {
    setState({ kind: 'loading' });
    void load();
  }

  useEffect(() => {
    void (async () => {
      const cached = await getFollowedCache();
      if (cached && cached.streams.length > 0) {
        setState({ kind: 'loaded', streams: cached.streams });
      }
      await load();
    })();

    function handleStorageChange(
      changes: Record<string, Browser.storage.StorageChange>,
      area: string,
    ) {
      if (area !== 'session' || !changes[FOLLOWED_CACHE_KEY]) return;
      const next = changes[FOLLOWED_CACHE_KEY].newValue as FollowedCache | undefined;
      if (!next || !Array.isArray(next.streams)) return;
      setState(
        next.streams.length === 0 ? { kind: 'empty' } : { kind: 'loaded', streams: next.streams },
      );
    }
    browser.storage.onChanged.addListener(handleStorageChange);
    return () => browser.storage.onChanged.removeListener(handleStorageChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <p className="sr-only" aria-live="polite">
        {state.kind === 'loading' && browser.i18n.getMessage('authLoading')}
        {state.kind === 'error' && browser.i18n.getMessage('followedError')}
        {state.kind === 'empty' && browser.i18n.getMessage('followedEmpty')}
        {state.kind === 'loaded' &&
          browser.i18n.getMessage('followedLoadedAnnouncement', [String(state.streams.length)])}
      </p>

      {state.kind === 'loading' && <StreamSkeleton density={density} />}

      {state.kind === 'error' && (
        <StreamError message={browser.i18n.getMessage('followedError')} onRetry={retry} />
      )}

      {state.kind === 'empty' && (
        <StreamEmpty message={browser.i18n.getMessage('followedEmpty')}>
          <span className="text-[13px] font-semibold text-brand">
            {browser.i18n.getMessage('followedEmptyCta')}
          </span>
        </StreamEmpty>
      )}

      {state.kind === 'loaded' &&
        (() => {
          const locale = browser.i18n.getUILanguage();
          const games = gameOptions(state.streams, locale);
          // A game can disappear between renders when its streams end.
          const activeGame = games.includes(game) ? game : ALL_GAMES;
          const shown = sortStreams(filterByGame(state.streams, activeGame), sort, locale);
          const controls = (
            <div className="flex flex-none items-center gap-2 border-b border-hairline px-3 py-2">
              <select
                aria-label={browser.i18n.getMessage('sortLabel')}
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className="min-w-0 flex-1 rounded-md border border-hairline bg-panel px-2 py-1 text-xs text-ink"
              >
                {SORT_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {browser.i18n.getMessage(SORT_MESSAGE[key])}
                  </option>
                ))}
              </select>
              <select
                aria-label={browser.i18n.getMessage('filterGameLabel')}
                value={activeGame}
                onChange={(event) => setGame(event.target.value)}
                className="min-w-0 flex-1 rounded-md border border-hairline bg-panel px-2 py-1 text-xs text-ink"
              >
                <option value={ALL_GAMES}>{browser.i18n.getMessage('filterAllGames')}</option>
                {games.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          );
          return (
            <StreamList density={density} header={controls}>
              {shown.map((stream) => (
                <StreamCard key={stream.id} stream={stream} density={density} />
              ))}
            </StreamList>
          );
        })()}
    </>
  );
}

export default FollowedView;
