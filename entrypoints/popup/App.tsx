import { useEffect, useState } from 'react';
import { browser, type Browser } from 'wxt/browser';
import { sendMessage } from '@/lib/messaging';
import type { AuthMessage, AuthResponse } from '@/lib/auth/types';
import {
  DENSITY_KEY,
  getDensity,
  getNotificationSettings,
  getTheme,
  NOTIFICATIONS_KEY,
  setDensity,
  setNotificationSettings,
  setTheme,
  THEME_KEY,
} from '@/lib/settings/storage';
import {
  DEFAULT_DENSITY,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_THEME,
  type Density,
  type NotificationSettings,
  type Theme,
} from '@/lib/settings/types';
import { applyTheme } from '@/lib/settings/theme';
import PopupHeader, { type Tab } from './PopupHeader';
import PopupSettings from './PopupSettings';
import FollowedView from './FollowedView';
import PopularView from './PopularView';
import { StreamSkeleton } from './StreamStates';

type Auth = 'loading' | 'connected' | 'disconnected';

function App() {
  const [auth, setAuth] = useState<Auth>('loading');
  const [connecting, setConnecting] = useState(false);
  const [density, setDensityState] = useState<Density>(DEFAULT_DENSITY);
  const [notifications, setNotificationsState] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS,
  );
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab] = useState<Tab>('followed');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getDensity().then(setDensityState);
    getNotificationSettings().then(setNotificationsState);
    getTheme().then(setThemeState);
    // The popup can stay mounted while its devtools are attached, and both of
    // these settings also exist on the options page, so a change made there
    // needs to apply live too.
    function handleStorageChange(
      changes: Record<string, Browser.storage.StorageChange>,
      area: string,
    ) {
      if (area !== 'sync') return;
      if (changes[DENSITY_KEY]) {
        setDensityState(changes[DENSITY_KEY].newValue as Density);
      }
      if (changes[THEME_KEY]) {
        const next = (changes[THEME_KEY].newValue as Theme | undefined) ?? DEFAULT_THEME;
        setThemeState(next);
        applyTheme(next);
      }
      if (changes[NOTIFICATIONS_KEY]) {
        setNotificationsState({
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...(changes[NOTIFICATIONS_KEY].newValue as Partial<NotificationSettings>),
        });
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

  async function handleDensityChange(next: Density) {
    setDensityState(next);
    await setDensity(next);
  }

  async function handleThemeChange(next: Theme) {
    setThemeState(next);
    applyTheme(next);
    await setTheme(next);
  }

  async function handleNotificationsChange(next: NotificationSettings) {
    setNotificationsState(next);
    await setNotificationSettings(next);
  }

  const panel =
    'w-[380px] overflow-hidden border border-hairline bg-panel text-sm shadow-[0_1px_3px_rgba(0,0,0,.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,.3)]';

  if (showSettings) {
    return (
      <div className={`${panel} rounded-2xl`}>
        <PopupSettings
          density={density}
          theme={theme}
          notifications={notifications}
          onDensityChange={handleDensityChange}
          onThemeChange={handleThemeChange}
          onNotificationsChange={handleNotificationsChange}
          onBack={() => setShowSettings(false)}
        />
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

      {/* The key resets the active screen, so refresh also clears Popular's pages.
          ponytail: switching tabs refetches; lift the screens' state here if that bites. */}
      {auth === 'connected' &&
        (tab === 'popular' ? (
          <PopularView
            key={`popular-${refreshKey}`}
            density={density}
            onDisconnected={() => setAuth('disconnected')}
          />
        ) : (
          <FollowedView
            key={`followed-${refreshKey}`}
            density={density}
            onDisconnected={() => setAuth('disconnected')}
          />
        ))}
    </div>
  );
}

export default App;
