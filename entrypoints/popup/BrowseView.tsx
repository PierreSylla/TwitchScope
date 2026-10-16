import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { sendMessage } from '@/lib/messaging';
import type { GamesMessage, GamesResponse, GameView } from '@/lib/games/types';
import type { Density } from '@/lib/settings/types';
import GameStreams from './GameStreams';
import { StreamEmpty, StreamError, StreamSkeleton } from './StreamStates';

type State =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'empty' }
  | { kind: 'loaded'; games: GameView[]; cursor?: string; loadingMore: boolean };

interface BrowseViewProps {
  density: Density;
  onDisconnected: () => void;
}

function BrowseView({ density, onDisconnected }: BrowseViewProps) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [selected, setSelected] = useState<GameView | null>(null);

  async function loadFirstPage() {
    const res = await sendMessage<GamesResponse>({ type: 'games/getTop' } satisfies GamesMessage);
    if (!res.ok) {
      if (res.error === 'not_connected') onDisconnected();
      else setState({ kind: 'error' });
      return;
    }
    setState(
      res.games.length === 0
        ? { kind: 'empty' }
        : { kind: 'loaded', games: res.games, cursor: res.cursor, loadingMore: false },
    );
  }

  function retry() {
    setState({ kind: 'loading' });
    void loadFirstPage();
  }

  async function loadMore() {
    if (state.kind !== 'loaded' || !state.cursor || state.loadingMore) return;
    const cursor = state.cursor;
    setState({ ...state, loadingMore: true });
    const res = await sendMessage<GamesResponse>({
      type: 'games/getTop',
      cursor,
    } satisfies GamesMessage);
    setState((prev) => {
      if (prev.kind !== 'loaded') return prev;
      if (!res.ok) return { ...prev, loadingMore: false };
      const seen = new Set(prev.games.map((g) => g.id));
      return {
        kind: 'loaded',
        games: [...prev.games, ...res.games.filter((g) => !seen.has(g.id))],
        cursor: res.cursor,
        loadingMore: false,
      };
    });
  }

  useEffect(() => {
    void (async () => {
      await loadFirstPage();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (selected) {
    return (
      <GameStreams
        gameId={selected.id}
        gameName={selected.name}
        density={density}
        onBack={() => setSelected(null)}
        onDisconnected={onDisconnected}
      />
    );
  }

  return (
    <>
      <p className="sr-only" aria-live="polite">
        {state.kind === 'loading' && browser.i18n.getMessage('authLoading')}
        {state.kind === 'error' && browser.i18n.getMessage('browseError')}
        {state.kind === 'empty' && browser.i18n.getMessage('browseEmpty')}
        {state.kind === 'loaded' &&
          browser.i18n.getMessage('browseLoadedAnnouncement', [String(state.games.length)])}
      </p>

      {state.kind === 'loading' && <StreamSkeleton density={density} />}

      {state.kind === 'error' && (
        <StreamError message={browser.i18n.getMessage('browseError')} onRetry={retry} />
      )}

      {state.kind === 'empty' && <StreamEmpty message={browser.i18n.getMessage('browseEmpty')} />}

      {state.kind === 'loaded' && (
        <div className="grid max-h-[480px] grid-cols-2 gap-3 overflow-y-auto p-3">
          {state.games.map((game) => (
            <button
              key={game.id}
              type="button"
              onClick={() => setSelected(game)}
              className="flex flex-col gap-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <div className="aspect-[3/4] overflow-hidden rounded-xl border border-hairline bg-tile">
                <img src={game.boxArtUrl} alt="" className="h-full w-full object-cover" />
              </div>
              <span className="truncate text-[13px] font-semibold text-ink">{game.name}</span>
            </button>
          ))}
          {state.cursor && (
            <button
              type="button"
              onClick={loadMore}
              disabled={state.loadingMore}
              className="col-span-2 py-1.5 text-center text-[13px] font-semibold text-brand disabled:opacity-50"
            >
              {browser.i18n.getMessage(state.loadingMore ? 'authLoading' : 'loadMoreButton')}
            </button>
          )}
        </div>
      )}
    </>
  );
}

export default BrowseView;
