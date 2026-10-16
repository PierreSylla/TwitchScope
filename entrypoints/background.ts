import { browser } from 'wxt/browser';
import { TOKEN_VALIDATION_INTERVAL_MINUTES } from '@/lib/config';
import { getStatus, login, logout, revalidateSession } from '@/lib/auth/oauth';
import { clearSession, getSession } from '@/lib/auth/storage';
import type { AuthMessage, AuthResponse } from '@/lib/auth/types';
import { createHelixClient, type HelixClient } from '@/lib/helix/client';
import { HelixAuthError } from '@/lib/helix/types';
import { getFollowedStreams, getTopStreams, type HelixStream } from '@/lib/helix/streams';
import { getUsersByIds } from '@/lib/helix/users';
import { toStreamViews } from '@/lib/streams/mapper';
import {
  clearLiveBaseline,
  getLiveBaseline,
  newlyLive,
  setLiveBaseline,
} from '@/lib/streams/liveSet';
import { loginFromNotificationId, notificationIdFor } from '@/lib/streams/notifications';
import type { StreamView, StreamsMessage, StreamsResponse } from '@/lib/streams/types';
import { getNotificationSettings, NOTIFICATIONS_KEY } from '@/lib/settings/storage';

const TOKEN_VALIDATION_ALARM = 'auth-token-validate';
const POLL_ALARM = 'followed-streams-poll';
const BADGE_COLOR = '#7C5CFC';

const helixClient: HelixClient = createHelixClient({
  getAccessToken: async () => (await getSession())?.accessToken ?? null,
  onUnauthorized: () => clearSession(),
});

const TOP_STREAMS_PAGE_SIZE = 20;

interface StreamsPage {
  streams: HelixStream[];
  cursor?: string;
}

async function respondWithStreams(
  load: (userId: string) => Promise<StreamsPage>,
): Promise<StreamsResponse> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'not_connected' };

  try {
    const { streams, cursor } = await load(session.userId);
    const users = await getUsersByIds(helixClient, [...new Set(streams.map((s) => s.user_id))]);
    const usersById = new Map(users.map((u) => [u.id, u]));
    return { ok: true, streams: toStreamViews(streams, usersById), cursor };
  } catch (err) {
    if (err instanceof HelixAuthError) return { ok: false, error: 'not_connected' };
    return { ok: false, error: 'fetch_failed' };
  }
}

async function setBadge(count: number) {
  await browser.action.setBadgeText({ text: count > 0 ? String(count) : '' });
}

function notifyLive(stream: StreamView) {
  browser.notifications.create(notificationIdFor(stream.login), {
    type: 'basic',
    iconUrl: browser.runtime.getURL('/icon/128.png'),
    title: browser.i18n.getMessage('notificationLiveTitle', [stream.channel]),
    message: stream.game ? `${stream.game} — ${stream.title}` : stream.title,
  });
}

/** Polls followed streams to drive notifications and the badge. */
async function pollFollowedStreams(notify: boolean) {
  const session = await getSession();
  if (!session) {
    await setBadge(0);
    return;
  }

  let streams: StreamView[];
  try {
    const helixStreams = await getFollowedStreams(helixClient, session.userId);
    // No avatars: the poll only needs identities and a count, and skipping
    // GET /users halves its rate-limit cost.
    streams = toStreamViews(helixStreams, new Map());
  } catch {
    return;
  }

  const settings = await getNotificationSettings();
  if (notify && settings.enabled) {
    const baseline = await getLiveBaseline();
    for (const stream of newlyLive(baseline, streams)) notifyLive(stream);
  }

  await setLiveBaseline(streams);
  await setBadge(streams.length);
}

async function schedulePolling() {
  const { intervalMinutes } = await getNotificationSettings();
  browser.alarms.create(POLL_ALARM, { periodInMinutes: intervalMinutes });
}

type AppMessage = AuthMessage | StreamsMessage;
type AppResponse = AuthResponse | StreamsResponse;

async function handleMessage(message: AppMessage): Promise<AppResponse> {
  switch (message.type) {
    case 'auth/getStatus':
      return { ok: true, status: await getStatus() };
    case 'auth/login': {
      const res = await login();
      // Fill the badge and the diff baseline right away rather than waiting a
      // whole polling period; never notify for channels already live at login.
      if (res.ok && res.status.connected) await pollFollowedStreams(false);
      return res;
    }
    case 'auth/logout': {
      const res = await logout();
      await clearLiveBaseline();
      await setBadge(0);
      return res;
    }
    case 'streams/getFollowed': {
      const res = await respondWithStreams(async (userId) => ({
        streams: await getFollowedStreams(helixClient, userId),
      }));
      // Keep the badge honest after a manual refresh, reusing this response
      // instead of spending another Helix call. Notifications stay on the poll.
      if (res.ok) {
        await setLiveBaseline(res.streams);
        await setBadge(res.streams.length);
      }
      return res;
    }
    case 'streams/getTop':
      return respondWithStreams(() =>
        getTopStreams(helixClient, { first: TOP_STREAMS_PAGE_SIZE, after: message.cursor }),
      );
  }
}

function onStart() {
  browser.alarms.create(TOKEN_VALIDATION_ALARM, {
    periodInMinutes: TOKEN_VALIDATION_INTERVAL_MINUTES,
  });
  void revalidateSession();
  void schedulePolling();
  void browser.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
}

export default defineBackground({
  type: 'module',
  main() {
    browser.runtime.onInstalled.addListener(onStart);
    browser.runtime.onStartup.addListener(onStart);

    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === TOKEN_VALIDATION_ALARM) void revalidateSession();
      if (alarm.name === POLL_ALARM) void pollFollowedStreams(true);
    });

    // A changed interval only takes effect once the alarm is recreated.
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes[NOTIFICATIONS_KEY]) void schedulePolling();
    });

    browser.notifications.onClicked.addListener((notificationId) => {
      const login = loginFromNotificationId(notificationId);
      if (!login) return;
      void browser.tabs.create({ url: `https://twitch.tv/${login}` });
      void browser.notifications.clear(notificationId);
    });

    browser.runtime.onMessage.addListener((message: AppMessage) => handleMessage(message));
  },
});
