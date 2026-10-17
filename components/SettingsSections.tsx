import { useEffect, useState } from 'react';
import { browser, type Browser } from 'wxt/browser';
import { sendMessage } from '@/lib/messaging';
import type { AuthMessage, AuthResponse } from '@/lib/auth/types';
import {
  DENSITY_KEY,
  LANGUAGE_KEY,
  MUTED_CHANNELS_KEY,
  NOTIFICATIONS_KEY,
  THEME_KEY,
  getDensity,
  getLanguage,
  getMutedChannels,
  getNotificationSettings,
  getTheme,
  setChannelMuted,
  setDensity,
  setLanguage,
  setNotificationSettings,
  setTheme,
} from '@/lib/settings/storage';
import type { ChannelsMessage, ChannelsResponse, FollowedChannelView } from '@/lib/channels/types';
import {
  DEFAULT_DENSITY,
  DEFAULT_LANGUAGE,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_THEME,
  POLLING_INTERVAL_OPTIONS,
  type Density,
  type Language,
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
import {
  densityOptions,
  intervalLabel,
  languageOptions,
  themeOptions,
} from '@/lib/settings/labels';
import { localeFor } from '@/lib/i18n/apply';
import { setLocale } from '@/lib/i18n/messages';
import { t } from '@/lib/i18n/messages';

/**
 * Reads a synced setting and keeps following it: the same section is rendered in
 * the popup and on the options page, and a write from either must reach both.
 */
function useSyncedSetting<T>(key: string, read: () => Promise<T>, initial: T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    let alive = true;
    const pull = () => {
      void read().then((next) => {
        if (alive) setValue(next);
      });
    };
    pull();
    function onChanged(changes: Record<string, Browser.storage.StorageChange>, area: string) {
      if (area === 'sync' && changes[key]) pull();
    }
    browser.storage.onChanged.addListener(onChanged);
    return () => {
      alive = false;
      browser.storage.onChanged.removeListener(onChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, setValue] as const;
}

export function SectionHeading({
  messageKey,
}: {
  messageKey:
    | 'settingsDensityLabel'
    | 'settingsNotificationsLabel'
    | 'settingsThemeLabel'
    | 'settingsChannelsLabel'
    | 'settingsLanguageLabel';
}) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
      {t(messageKey)}
    </h2>
  );
}

export function DensitySection() {
  const [density, setDensityState] = useSyncedSetting(DENSITY_KEY, getDensity, DEFAULT_DENSITY);

  async function handleSelect(next: Density) {
    setDensityState(next);
    await setDensity(next);
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading messageKey="settingsDensityLabel" />
      <SegmentedControl options={densityOptions()} value={density} onChange={handleSelect} />
    </section>
  );
}

type ChannelsState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; channels: FollowedChannelView[]; cursor?: string; loadingMore: boolean };

export function ChannelNotificationsSection() {
  const [state, setState] = useState<ChannelsState>({ kind: 'loading' });
  const [muted, setMuted] = useSyncedSetting<string[]>(MUTED_CHANNELS_KEY, getMutedChannels, []);

  useEffect(() => {
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
        {t('settingsChannelsHint')}
        {muted.length > 0 && ` — ${t('settingsChannelsMutedCount', [String(muted.length)])}`}
      </p>

      {state.kind === 'loading' && <p className="text-sm text-ink-muted">{t('authLoading')}</p>}
      {state.kind === 'error' && (
        <p className="text-sm text-ink-muted">{t('settingsChannelsError')}</p>
      )}
      {state.kind === 'loaded' && state.channels.length === 0 && (
        <p className="text-sm text-ink-muted">{t('settingsChannelsEmpty')}</p>
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
              {t(state.loadingMore ? 'authLoading' : 'loadMoreButton')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export function ThemeSection() {
  const [theme, setThemeState] = useSyncedSetting(THEME_KEY, getTheme, DEFAULT_THEME);

  async function handleSelect(next: Theme) {
    setThemeState(next);
    applyTheme(next);
    await setTheme(next);
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading messageKey="settingsThemeLabel" />
      <SegmentedControl options={themeOptions()} value={theme} onChange={handleSelect} />
    </section>
  );
}

export function NotificationsSection() {
  const [settings, setSettings] = useSyncedSetting(
    NOTIFICATIONS_KEY,
    getNotificationSettings,
    DEFAULT_NOTIFICATION_SETTINGS,
  );

  async function update(next: NotificationSettings) {
    setSettings(next);
    await setNotificationSettings(next);
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading messageKey="settingsNotificationsLabel" />
      <SettingsRow label={t('settingsNotificationsEnable')}>
        <ToggleSwitch
          checked={settings.enabled}
          label={t('settingsNotificationsEnable')}
          onChange={(enabled) => void update({ ...settings, enabled })}
        />
      </SettingsRow>
      <SettingsRow label={t('settingsNotificationsFrequency')}>
        <IntervalSelect
          value={settings.intervalMinutes}
          options={POLLING_INTERVAL_OPTIONS}
          label={t('settingsNotificationsFrequency')}
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

export function AccountSection() {
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
        {t('settingsAccountLabel')}
      </h2>

      {state.kind === 'loading' && <p className="text-sm text-ink-muted">{t('authLoading')}</p>}

      {state.kind === 'connected' && (
        <div className="flex items-center justify-between rounded-xl border border-hairline bg-tile p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-hairline font-mono text-xs font-bold text-ink-muted">
              {state.login.slice(0, 2).toUpperCase()}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-ink">{state.login}</span>
              <span className="text-xs text-ink-muted">{t('settingsConnectedWith')}</span>
            </div>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={handleDisconnect}
            className="rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {t(pending ? 'authDisconnectingButton' : 'authDisconnectButton')}
          </button>
        </div>
      )}

      {state.kind === 'disconnected' && (
        <div className="flex items-center justify-between rounded-xl border border-hairline bg-tile p-3">
          <span className="text-sm text-ink-muted">{t('settingsConnectPrompt')}</span>
          <button
            type="button"
            disabled={pending}
            onClick={handleConnect}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t(pending ? 'authConnectingButton' : 'authConnectButton')}
          </button>
        </div>
      )}
    </section>
  );
}

export function LanguageSection({ onChange }: { onChange?: () => void } = {}) {
  const [language, setLanguageState] = useSyncedSetting(
    LANGUAGE_KEY,
    getLanguage,
    DEFAULT_LANGUAGE,
  );

  async function handleSelect(next: Language) {
    setLanguageState(next);
    setLocale(localeFor(next));
    await setLanguage(next);
    onChange?.();
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading messageKey="settingsLanguageLabel" />
      <SettingsRow label={t('settingsLanguageRow')}>
        <select
          aria-label={t('settingsLanguageRow')}
          value={language}
          onChange={(event) => void handleSelect(event.target.value as Language)}
          className="rounded-lg border border-hairline bg-panel px-3 py-2 text-[13px] text-ink"
        >
          {languageOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </SettingsRow>
    </section>
  );
}
