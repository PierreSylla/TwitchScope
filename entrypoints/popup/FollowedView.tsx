import { useEffect, useState } from 'react';
import { browser, type Browser } from 'wxt/browser';
import { sendMessage } from '@/lib/messaging';
import type { StreamsMessage, StreamsResponse, StreamView } from '@/lib/streams/types';
import type { Density } from '@/lib/settings/types';
import { FOLLOWED_CACHE_KEY, getFollowedCache, type FollowedCache } from '@/lib/streams/cache';
import StreamCard from './StreamCard';
import { StreamEmpty, StreamError, StreamList, StreamSkeleton } from './StreamStates';

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

      {state.kind === 'loaded' && (
        <StreamList density={density}>
          {state.streams.map((stream) => (
            <StreamCard key={stream.id} stream={stream} density={density} />
          ))}
        </StreamList>
      )}
    </>
  );
}

export default FollowedView;
