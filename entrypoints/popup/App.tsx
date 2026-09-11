import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { sendMessage } from '@/lib/messaging';
import type { AuthMessage, AuthResponse } from '@/lib/auth/types';
import type { StreamsMessage, StreamsResponse } from '@/lib/streams/types';
import type { FollowedStreamView } from '@/lib/streams/types';
import { getDensity } from '@/lib/settings/storage';
import { DEFAULT_DENSITY, type Density } from '@/lib/settings/types';
import PopupHeader from './PopupHeader';
import StreamCard from './StreamCard';

type ViewState =
  | { kind: 'authLoading' }
  | { kind: 'disconnected' }
  | { kind: 'streamsLoading' }
  | { kind: 'streamsError' }
  | { kind: 'streamsEmpty' }
  | { kind: 'streamsLoaded'; streams: FollowedStreamView[] };

function announce(state: ViewState): string {
  switch (state.kind) {
    case 'authLoading':
    case 'streamsLoading':
      return browser.i18n.getMessage('authLoading');
    case 'disconnected':
      return browser.i18n.getMessage('followedDisconnectedTitle');
    case 'streamsError':
      return browser.i18n.getMessage('followedError');
    case 'streamsEmpty':
      return browser.i18n.getMessage('followedEmpty');
    case 'streamsLoaded':
      return browser.i18n.getMessage('followedLoadedAnnouncement', [String(state.streams.length)]);
  }
}

async function loadStreams(): Promise<ViewState> {
  const res = await sendMessage<StreamsResponse>({
    type: 'streams/getFollowed',
  } satisfies StreamsMessage);
  if (!res.ok)
    return res.error === 'not_connected' ? { kind: 'disconnected' } : { kind: 'streamsError' };
  return res.streams.length === 0
    ? { kind: 'streamsEmpty' }
    : { kind: 'streamsLoaded', streams: res.streams };
}

function App() {
  const [state, setState] = useState<ViewState>({ kind: 'authLoading' });
  const [connecting, setConnecting] = useState(false);
  const [density, setDensity] = useState<Density>(DEFAULT_DENSITY);
  const compact = density === 'compact';

  useEffect(() => {
    getDensity().then(setDensity);
    (async () => {
      const authRes = await sendMessage<AuthResponse>({
        type: 'auth/getStatus',
      } satisfies AuthMessage);
      if (!authRes.ok || !authRes.status.connected) {
        setState({ kind: 'disconnected' });
        return;
      }
      setState({ kind: 'streamsLoading' });
      setState(await loadStreams());
    })();
  }, []);

  async function handleConnect() {
    setConnecting(true);
    const res = await sendMessage<AuthResponse>({ type: 'auth/login' } satisfies AuthMessage);
    setConnecting(false);
    if (!res.ok || !res.status.connected) return;
    setState({ kind: 'streamsLoading' });
    setState(await loadStreams());
  }

  async function handleRefresh() {
    setState({ kind: 'streamsLoading' });
    setState(await loadStreams());
  }

  const showChrome = state.kind !== 'authLoading' && state.kind !== 'disconnected';
  const listPadding = compact ? 'gap-2 p-2' : 'gap-3 p-3';

  return (
    <div className="w-[380px] overflow-hidden rounded-2xl border border-hairline bg-panel text-sm shadow-[0_1px_3px_rgba(0,0,0,.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,.3)]">
      <PopupHeader showChrome={showChrome} density={density} onRefresh={handleRefresh} />
      <p className="sr-only" aria-live="polite">
        {announce(state)}
      </p>

      {(state.kind === 'authLoading' || state.kind === 'streamsLoading') && (
        <div className={`flex min-h-[460px] flex-col ${listPadding}`}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-hairline bg-tile">
              <div className="aspect-video bg-hairline" />
              <div className="flex flex-col gap-2 p-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-hairline" />
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="h-2 w-3/5 rounded bg-hairline" />
                    <div className="h-1.5 w-2/5 rounded bg-hairline" />
                  </div>
                </div>
                <div className="h-1.5 w-4/5 rounded bg-hairline" />
              </div>
            </div>
          ))}
        </div>
      )}

      {state.kind === 'disconnected' && (
        <div className="flex min-h-[504px] flex-col items-center justify-center gap-3.5 p-8 text-center">
          <span className="relative block h-12 w-12 rounded-full border-2 border-brand">
            <span className="absolute -bottom-px -right-px block h-3.5 w-3.5 rounded-full bg-brand" />
          </span>
          <p className="text-sm font-semibold text-ink">
            {browser.i18n.getMessage('followedDisconnectedTitle')}
          </p>
          <p className="max-w-[260px] text-[13px] leading-relaxed text-ink-muted">
            {browser.i18n.getMessage('followedDisconnectedBody')}
          </p>
          <button
            type="button"
            disabled={connecting}
            onClick={handleConnect}
            className="rounded-lg bg-brand px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {browser.i18n.getMessage(connecting ? 'authConnectingButton' : 'authConnectButton')}
          </button>
        </div>
      )}

      {state.kind === 'streamsError' && (
        <div className="flex min-h-[504px] flex-col items-center justify-center gap-3.5 p-8 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-red-500 text-lg font-bold text-red-500">
            !
          </div>
          <p className="max-w-[260px] text-[13px] leading-relaxed text-ink-muted">
            {browser.i18n.getMessage('followedError')}
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-lg border border-hairline px-[18px] py-[9px] text-[13px] font-semibold text-ink"
          >
            {browser.i18n.getMessage('authRetryButton')}
          </button>
        </div>
      )}

      {state.kind === 'streamsEmpty' && (
        <div className="flex min-h-[460px] flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="block h-11 w-11 rounded-full border-2 border-hairline" />
          <p className="max-w-[260px] text-[13px] leading-relaxed text-ink-muted">
            {browser.i18n.getMessage('followedEmpty')}
          </p>
          <span className="text-[13px] font-semibold text-brand">
            {browser.i18n.getMessage('followedEmptyCta')}
          </span>
        </div>
      )}

      {state.kind === 'streamsLoaded' && (
        <div className={`flex min-h-[460px] flex-col ${listPadding}`}>
          {state.streams.map((stream) => (
            <StreamCard key={stream.id} stream={stream} density={density} />
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
