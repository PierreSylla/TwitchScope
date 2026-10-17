import { useEffect, useState } from 'react';
import { browser, type Browser } from 'wxt/browser';
import { sendMessage } from '@/lib/messaging';
import type { AuthMessage, AuthResponse } from '@/lib/auth/types';
import { DENSITY_KEY, getDensity, LANGUAGE_KEY, THEME_KEY } from '@/lib/settings/storage';
import { DEFAULT_DENSITY, DEFAULT_THEME, type Density, type Theme } from '@/lib/settings/types';
import { applyTheme } from '@/lib/settings/theme';
import { localeFor } from '@/lib/i18n/apply';
import { setLocale } from '@/lib/i18n/messages';
import type { Language } from '@/lib/settings/types';
import PopupHeader, { type Tab } from './PopupHeader';
import PopupSettings from './PopupSettings';
import FollowedView from './FollowedView';
import PopularView from './PopularView';
import BrowseView from './BrowseView';
import SearchView from './SearchView';
import { StreamSkeleton } from './StreamStates';
import { t } from '@/lib/i18n/messages';

type Auth = 'loading' | 'connected' | 'disconnected';

function App() {
  const [auth, setAuth] = useState<Auth>('loading');
  const [connecting, setConnecting] = useState(false);
  const [density, setDensityState] = useState<Density>(DEFAULT_DENSITY);
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab] = useState<Tab>('followed');
  const [refreshKey, setRefreshKey] = useState(0);
  const [, forceRender] = useState(0);

  useEffect(() => {
    getDensity().then(setDensityState);
    // The popup can stay mounted while settings change elsewhere, so follow
    // storage rather than reading once.
    function handleStorageChange(
      changes: Record<string, Browser.storage.StorageChange>,
      area: string,
    ) {
      if (area !== 'sync') return;
      if (changes[DENSITY_KEY]) {
        setDensityState(changes[DENSITY_KEY].newValue as Density);
      }
      if (changes[THEME_KEY]) {
        applyTheme((changes[THEME_KEY].newValue as Theme | undefined) ?? DEFAULT_THEME);
      }
      if (changes[LANGUAGE_KEY]) {
        setLocale(localeFor((changes[LANGUAGE_KEY].newValue as Language | undefined) ?? 'auto'));
        forceRender((n) => n + 1);
      }
    }
    browser.storage.onChanged.addListener(handleStorageChange);

    (async () => {
      const authRes = await sendMessage<AuthResponse>({
        type: 'auth/getStatus',
      } satisfies AuthMessage);
      setAuth(!authRes.ok || !authRes.status.connected ? 'disconnected' : 'connected');
    })();

    return () => browser.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  async function handleConnect() {
    setConnecting(true);
    const res = await sendMessage<AuthResponse>({ type: 'auth/login' } satisfies AuthMessage);
    setConnecting(false);
    if (res.ok && res.status.connected) setAuth('connected');
  }

  // A fixed height keeps the window one size whichever view is showing, and
  // makes long panels scroll inside it rather than growing the popup.
  const panel =
    'flex h-[563px] w-[380px] flex-col overflow-hidden border border-hairline bg-panel text-sm shadow-[0_1px_3px_rgba(0,0,0,.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,.3)]';

  if (showSettings) {
    return (
      <div className={`${panel} rounded-2xl`}>
        <PopupSettings onBack={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <div className={panel}>
      <PopupHeader
        showChrome={auth === 'connected'}
        density={density}
        activeTab={tab}
        onTabChange={setTab}
        onRefresh={() => setRefreshKey((n) => n + 1)}
        onSettings={() => setShowSettings(true)}
      />

      {auth === 'loading' && <StreamSkeleton density={density} />}

      {auth === 'disconnected' && (
        <div className="flex min-h-[504px] flex-col items-center justify-center gap-3.5 p-8 text-center">
          <span className="relative block h-12 w-12 rounded-full border-2 border-brand">
            <span className="absolute -bottom-px -right-px block h-3.5 w-3.5 rounded-full bg-brand" />
          </span>
          <p className="text-sm font-semibold text-ink">{t('followedDisconnectedTitle')}</p>
          <p className="max-w-[260px] text-[13px] leading-relaxed text-ink-muted">
            {t('followedDisconnectedBody')}
          </p>
          <button
            type="button"
            disabled={connecting}
            onClick={handleConnect}
            className="rounded-lg bg-brand px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {t(connecting ? 'authConnectingButton' : 'authConnectButton')}
          </button>
        </div>
      )}

      {/* The key resets the active screen, so refresh also clears Popular's pages.
          ponytail: switching tabs refetches; lift the screens' state here if that bites. */}
      {auth === 'connected' &&
        (() => {
          const key = `${tab}-${refreshKey}`;
          const onDisconnected = () => setAuth('disconnected');
          if (tab === 'popular')
            return <PopularView key={key} density={density} onDisconnected={onDisconnected} />;
          if (tab === 'browse')
            return <BrowseView key={key} density={density} onDisconnected={onDisconnected} />;
          if (tab === 'search')
            return <SearchView key={key} density={density} onDisconnected={onDisconnected} />;
          return <FollowedView key={key} density={density} onDisconnected={onDisconnected} />;
        })()}
    </div>
  );
}

export default App;
