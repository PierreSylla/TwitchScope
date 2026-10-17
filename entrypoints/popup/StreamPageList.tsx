import { useEffect, useState } from 'react';
import type { StreamsResponse, StreamView } from '@/lib/streams/types';
import type { Density } from '@/lib/settings/types';
import StreamCard from './StreamCard';
import { StreamEmpty, StreamError, StreamList, StreamSkeleton } from './StreamStates';
import { t } from '@/lib/i18n/messages';

type State =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'empty' }
  | { kind: 'loaded'; streams: StreamView[]; cursor?: string; loadingMore: boolean };

interface StreamPageListProps {
  density: Density;
  errorMessage: string;
  emptyMessage: string;
  announce: (count: number) => string;
  fetchPage: (cursor?: string) => Promise<StreamsResponse>;
  onDisconnected: () => void;
}

/** Helix can repeat a stream across pages when the ranking shifts mid-pagination. */
function appendUnique(current: StreamView[], next: StreamView[]): StreamView[] {
  const seen = new Set(current.map((s) => s.id));
  return [...current, ...next.filter((s) => !seen.has(s.id))];
}

function StreamPageList({
  density,
  errorMessage,
  emptyMessage,
  announce,
  fetchPage,
  onDisconnected,
}: StreamPageListProps) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  async function loadFirstPage() {
    const res = await fetchPage();
    if (!res.ok) {
      if (res.error === 'not_connected') onDisconnected();
      else setState({ kind: 'error' });
      return;
    }
    setState(
      res.streams.length === 0
        ? { kind: 'empty' }
        : { kind: 'loaded', streams: res.streams, cursor: res.cursor, loadingMore: false },
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
    const res = await fetchPage(cursor);
    setState((prev) => {
      if (prev.kind !== 'loaded') return prev;
      // Keep the pages already loaded on failure; the button stays available.
      if (!res.ok) return { ...prev, loadingMore: false };
      return {
        kind: 'loaded',
        streams: appendUnique(prev.streams, res.streams),
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

  return (
    <>
      <p className="sr-only" aria-live="polite">
        {state.kind === 'loading' && t('authLoading')}
        {state.kind === 'error' && errorMessage}
        {state.kind === 'empty' && emptyMessage}
        {state.kind === 'loaded' && announce(state.streams.length)}
      </p>

      {state.kind === 'loading' && <StreamSkeleton density={density} />}

      {state.kind === 'error' && <StreamError message={errorMessage} onRetry={retry} />}

      {state.kind === 'empty' && <StreamEmpty message={emptyMessage} />}

      {state.kind === 'loaded' && (
        <StreamList density={density}>
          {state.streams.map((stream) => (
            <StreamCard key={stream.id} stream={stream} density={density} />
          ))}
          {state.cursor && (
            <button
              type="button"
              onClick={loadMore}
              disabled={state.loadingMore}
              className="flex-none py-1.5 text-center text-[13px] font-semibold text-brand disabled:opacity-50"
            >
              {t(state.loadingMore ? 'authLoading' : 'loadMoreButton')}
            </button>
          )}
        </StreamList>
      )}
    </>
  );
}

export default StreamPageList;
