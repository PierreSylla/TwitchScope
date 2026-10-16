import { useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { sendMessage } from '@/lib/messaging';
import type {
  CategoryResult,
  ChannelResult,
  SearchMessage,
  SearchResponse,
} from '@/lib/search/types';
import type { Density } from '@/lib/settings/types';
import { formatViewerCount } from '@/lib/streams/format';
import { ToggleSwitch } from '@/components/SettingsControls';
import GameStreams from './GameStreams';
import { StreamEmpty, StreamError } from './StreamStates';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

type State =
  | { kind: 'idle' }
  | { kind: 'error'; query: string }
  | { kind: 'results'; query: string; channels: ChannelResult[]; categories: CategoryResult[] };

interface SearchViewProps {
  density: Density;
  onDisconnected: () => void;
}

function SearchView({ density, onDisconnected }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [liveOnly, setLiveOnly] = useState(true);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [selected, setSelected] = useState<CategoryResult | null>(null);
  const latestRequest = useRef(0);

  const trimmed = query.trim();
  const tooShort = trimmed.length < MIN_QUERY_LENGTH;

  useEffect(() => {
    if (tooShort) return;
    const timer = setTimeout(() => {
      const requestId = ++latestRequest.current;
      void (async () => {
        const res = await sendMessage<SearchResponse>({
          type: 'search/run',
          query: trimmed,
          liveOnly,
        } satisfies SearchMessage);
        // Ignore a slow answer that a newer keystroke has already superseded.
        if (requestId !== latestRequest.current) return;
        if (!res.ok) {
          if (res.error === 'not_connected') onDisconnected();
          else setState({ kind: 'error', query: trimmed });
          return;
        }
        setState({
          kind: 'results',
          query: trimmed,
          channels: res.channels,
          categories: res.categories,
        });
      })();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, liveOnly, tooShort]);

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

  const fresh = !tooShort && state.kind !== 'idle' && state.query === trimmed;
  const results = fresh && state.kind === 'results' ? state : null;
  const failed = fresh && state.kind === 'error';
  const resultCount = results ? results.channels.length + results.categories.length : 0;
  const locale = browser.i18n.getUILanguage();

  return (
    <div className="flex max-h-[480px] flex-col gap-4 overflow-y-auto p-3">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={browser.i18n.getMessage('searchPlaceholder')}
        aria-label={browser.i18n.getMessage('searchPlaceholder')}
        className="flex-none rounded-lg border border-hairline bg-panel px-3 py-[9px] text-[13px] text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-brand"
      />

      <p className="sr-only" aria-live="polite">
        {!tooShort && !fresh && browser.i18n.getMessage('authLoading')}
        {failed && browser.i18n.getMessage('searchError')}
        {results && browser.i18n.getMessage('searchResultsAnnouncement', [String(resultCount)])}
      </p>

      {failed && (
        <StreamError
          message={browser.i18n.getMessage('searchError')}
          onRetry={() => setState({ kind: 'idle' })}
        />
      )}

      {results && resultCount === 0 && (
        <StreamEmpty message={browser.i18n.getMessage('searchNoResults')} />
      )}

      {!tooShort && !failed && (
        <section className="flex flex-none flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink">
              {browser.i18n.getMessage('searchSectionChannels')}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-ink-muted">
                {browser.i18n.getMessage('searchLiveOnly')}
              </span>
              <ToggleSwitch
                checked={liveOnly}
                size="sm"
                label={browser.i18n.getMessage('searchLiveOnly')}
                onChange={setLiveOnly}
              />
            </div>
          </div>
          {results?.channels.map((channel) => (
            <a
              key={channel.id}
              href={`https://twitch.tv/${channel.login}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-tile focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {channel.avatarUrl ? (
                <img src={channel.avatarUrl} alt="" className="h-7 w-7 flex-none rounded-full" />
              ) : (
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-hairline font-mono text-[10px] font-bold text-ink-muted">
                  {channel.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-semibold text-ink">{channel.name}</span>
                <span className="truncate text-xs text-ink-muted">{channel.game}</span>
              </span>
              {channel.isLive ? (
                <span className="flex flex-none items-center gap-1 text-[11px] font-semibold text-red-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {channel.viewerCount === null
                    ? ''
                    : formatViewerCount(channel.viewerCount, locale)}
                </span>
              ) : (
                <span className="flex-none text-[11px] text-ink-muted">
                  {browser.i18n.getMessage('searchOffline')}
                </span>
              )}
            </a>
          ))}
        </section>
      )}

      {results && results.categories.length > 0 && (
        <section className="flex flex-none flex-col gap-2">
          <span className="text-[13px] font-semibold text-ink">
            {browser.i18n.getMessage('searchSectionCategories')}
          </span>
          {results.categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelected(category)}
              className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-left hover:bg-tile focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <img
                src={category.boxArtUrl}
                alt=""
                className="h-[34px] w-[26px] flex-none rounded-md border border-hairline object-cover"
              />
              <span className="truncate text-[13px] font-semibold text-ink">{category.name}</span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}

export default SearchView;
