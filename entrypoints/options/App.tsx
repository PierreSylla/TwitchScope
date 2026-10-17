import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { sendMessage } from '@/lib/messaging';
import type { AuthMessage, AuthResponse } from '@/lib/auth/types';
import {
  getDensity,
  getMutedChannels,
  getNotificationSettings,
  getTheme,
  setChannelMuted,
  setDensity,
  setNotificationSettings,
  setTheme,
} from '@/lib/settings/storage';
import type { ChannelsMessage, ChannelsResponse, FollowedChannelView } from '@/lib/channels/types';
import {
  DEFAULT_DENSITY,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_THEME,
  POLLING_INTERVAL_OPTIONS,
  type Density,
  type NotificationSettings,
  type Theme,
} from '@/lib/settings/types';
import { applyTheme } from '@/lib/settings/theme';
import {
  IntervalSelect,
  SegmentedControl,
  SettingsRow,
  ToggleSwitch,
} from '@/components/SettingsControls';
import { DENSITY_OPTIONS, intervalLabel, THEME_OPTIONS } from '@/lib/settings/labels';

function SectionHeading({
  messageKey,
}: {
  messageKey:
    | 'settingsDensityLabel'
    | 'settingsNotificationsLabel'
    | 'settingsThemeLabel'
    | 'settingsChannelsLabel';
}) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
      {browser.i18n.getMessage(messageKey)}
    </h2>
  );
}

function DensitySection() {
  const [density, setDensityState] = useState<Density>(DEFAULT_DENSITY);

  useEffect(() => {
    getDensity().then(setDensityState);
  }, []);

  async function handleSelect(next: Density) {
    setDensityState(next);
    await setDensity(next);
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading messageKey="settingsDensityLabel" />
      <SegmentedControl options={DENSITY_OPTIONS} value={density} onChange={handleSelect} />
    </section>
  );
}

type ChannelsState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; channels: FollowedChannelView[]; cursor?: string; loadingMore: boolean };

function ChannelNotificationsSection() {
  const [state, setState] = useState<ChannelsState>({ kind: 'loading' });
  const [muted, setMuted] = useState<string[]>([]);

  useEffect(() => {
    getMutedChannels().then(setMuted);
    void (async () => {
      const res = await sendMessage<ChannelsResponse>({
        type: 'channels/getFollowed',
      } satisfies ChannelsMessage);
      setState(
        res.ok
          ? { kind: 'loaded', channels: res.channels, cursor: res.cursor, loadingMore: false }
          : { kind: 'error' },
      );
    })();
  }, []);

  async function loadMore() {
    if (state.kind !== 'loaded' || !state.cursor || state.loadingMore) return;
    const cursor = state.cursor;
    setState({ ...state, loadingMore: true });
    const res = await sendMessage<ChannelsResponse>({
      type: 'channels/getFollowed',
      cursor,
    } satisfies ChannelsMessage);
    setState((prev) => {
      if (prev.kind !== 'loaded') return prev;
      if (!res.ok) return { ...prev, loadingMore: false };
      const seen = new Set(prev.channels.map((c) => c.id));
      return {
        kind: 'loaded',
        channels: [...prev.channels, ...res.channels.filter((c) => !seen.has(c.id))],
        cursor: res.cursor,
        loadingMore: false,
      };
    });
  }

  async function toggle(channelId: string, notify: boolean) {
    setMuted(await setChannelMuted(channelId, !notify));
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading messageKey="settingsChannelsLabel" />
      <p className="text-xs text-ink-muted">
        {browser.i18n.getMessage('settingsChannelsHint')}
        {muted.length > 0 &&
          ` — ${browser.i18n.getMessage('settingsChannelsMutedCount', [String(muted.length)])}`}
      </p>

      {state.kind === 'loading' && (
        <p className="text-sm text-ink-muted">{browser.i18n.getMessage('authLoading')}</p>
      )}
      {state.kind === 'error' && (
        <p className="text-sm text-ink-muted">{browser.i18n.getMessage('settingsChannelsError')}</p>
      )}
      {state.kind === 'loaded' && state.channels.length === 0 && (
        <p className="text-sm text-ink-muted">{browser.i18n.getMessage('settingsChannelsEmpty')}</p>
      )}

      {state.kind === 'loaded' && state.channels.length > 0 && (
        <div className="flex max-h-[320px] flex-col divide-y divide-hairline overflow-y-auto rounded-xl border border-hairline">
          {state.channels.map((channel) => (
            <div key={channel.id} className="px-3 py-2">
              <SettingsRow label={channel.name}>
                <ToggleSwitch
                  checked={!muted.includes(channel.id)}
                  label={channel.name}
                  onChange={(notify) => void toggle(channel.id, notify)}
                />
              </SettingsRow>
            </div>
          ))}
          {state.cursor && (
            <button
              type="button"
              onClick={loadMore}
              disabled={state.loadingMore}
              className="px-3 py-2 text-center text-[13px] font-semibold text-brand disabled:opacity-50"
            >
              {browser.i18n.getMessage(state.loadingMore ? 'authLoading' : 'loadMoreButton')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function ThemeSection() {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    getTheme().then(setThemeState);
  }, []);

  async function handleSelect(next: Theme) {
    setThemeState(next);
    applyTheme(next);
    await setTheme(next);
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading messageKey="settingsThemeLabel" />
      <SegmentedControl options={THEME_OPTIONS} value={theme} onChange={handleSelect} />
    </section>
  );
}

function NotificationsSection() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);

  useEffect(() => {
    getNotificationSettings().then(setSettings);
  }, []);

  async function update(next: NotificationSettings) {
    setSettings(next);
    await setNotificationSettings(next);
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading messageKey="settingsNotificationsLabel" />
      <SettingsRow label={browser.i18n.getMessage('settingsNotificationsEnable')}>
        <ToggleSwitch
          checked={settings.enabled}
          label={browser.i18n.getMessage('settingsNotificationsEnable')}
          onChange={(enabled) => void update({ ...settings, enabled })}
        />
      </SettingsRow>
      <SettingsRow label={browser.i18n.getMessage('settingsNotificationsFrequency')}>
        <IntervalSelect
          value={settings.intervalMinutes}
          options={POLLING_INTERVAL_OPTIONS}
          label={browser.i18n.getMessage('settingsNotificationsFrequency')}
          format={intervalLabel}
          onChange={(intervalMinutes) => void update({ ...settings, intervalMinutes })}
        />
      </SettingsRow>
    </section>
  );
}

type AccountState =
  { kind: 'loading' } | { kind: 'connected'; login: string } | { kind: 'disconnected' };

async function sendAuthMessage(message: AuthMessage): Promise<AuthResponse> {
  return sendMessage<AuthResponse>(message);
}

function AccountSection() {
  const [state, setState] = useState<AccountState>({ kind: 'loading' });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    sendAuthMessage({ type: 'auth/getStatus' })
      .then((res) =>
        setState(
          res.ok && res.status.connected
            ? { kind: 'connected', login: res.status.login }
            : { kind: 'disconnected' },
        ),
      )
      .catch(() => setState({ kind: 'disconnected' }));
  }, []);

  async function handleDisconnect() {
    setPending(true);
    const res = await sendAuthMessage({ type: 'auth/logout' }).catch((): AuthResponse => ({
      ok: false,
      error: 'auth_failed',
    }));
    setPending(false);
    setState(
      res.ok && res.status.connected
        ? { kind: 'connected', login: res.status.login }
        : { kind: 'disconnected' },
    );
  }

  async function handleConnect() {
    setPending(true);
    const res = await sendAuthMessage({ type: 'auth/login' }).catch((): AuthResponse => ({
      ok: false,
      error: 'auth_failed',
    }));
    setPending(false);
    setState(
      res.ok && res.status.connected
        ? { kind: 'connected', login: res.status.login }
        : { kind: 'disconnected' },
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {browser.i18n.getMessage('settingsAccountLabel')}
      </h2>

      {state.kind === 'loading' && (
        <p className="text-sm text-ink-muted">{browser.i18n.getMessage('authLoading')}</p>
      )}

      {state.kind === 'connected' && (
        <div className="flex items-center justify-between rounded-xl border border-hairline bg-tile p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-hairline font-mono text-xs font-bold text-ink-muted">
              {state.login.slice(0, 2).toUpperCase()}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-ink">{state.login}</span>
              <span className="text-xs text-ink-muted">
                {browser.i18n.getMessage('settingsConnectedWith')}
              </span>
            </div>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={handleDisconnect}
            className="rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {browser.i18n.getMessage(pending ? 'authDisconnectingButton' : 'authDisconnectButton')}
          </button>
        </div>
      )}

      {state.kind === 'disconnected' && (
        <div className="flex items-center justify-between rounded-xl border border-hairline bg-tile p-3">
          <span className="text-sm text-ink-muted">
            {browser.i18n.getMessage('settingsConnectPrompt')}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={handleConnect}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {browser.i18n.getMessage(pending ? 'authConnectingButton' : 'authConnectButton')}
          </button>
        </div>
      )}
    </section>
  );
}

function App() {
  return (
    <div className="mx-auto max-w-[640px] overflow-hidden rounded-xl border border-hairline bg-panel shadow-[0_1px_3px_rgba(0,0,0,.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,.3)]">
      <div className="border-b border-hairline px-8 py-6">
        <h1 className="text-lg font-bold text-ink">
          {browser.i18n.getMessage('settingsPageTitle')}
        </h1>
      </div>
      <div className="flex flex-col gap-8 p-8">
        <AccountSection />
        <NotificationsSection />
        <ChannelNotificationsSection />
        <ThemeSection />
        <DensitySection />
      </div>
    </div>
  );
}

export default App;
