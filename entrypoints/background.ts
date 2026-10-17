import { browser } from 'wxt/browser';
import { TOKEN_VALIDATION_INTERVAL_MINUTES } from '@/lib/config';
import { getStatus, login, logout, revalidateSession } from '@/lib/auth/oauth';
import { clearSession, getSession } from '@/lib/auth/storage';
import type { AuthMessage, AuthResponse } from '@/lib/auth/types';
import { createHelixClient, type HelixClient } from '@/lib/helix/client';
import { HelixAuthError } from '@/lib/helix/types';
import { getFollowedStreams, getTopStreams, type HelixStream } from '@/lib/helix/streams';
import { getTopGames } from '@/lib/helix/games';
import { getFollowedChannels } from '@/lib/helix/channels';
import type { ChannelsMessage, ChannelsResponse } from '@/lib/channels/types';
import { searchCategories, searchChannels } from '@/lib/helix/search';
import { getStreamsByUserIds } from '@/lib/helix/streams';
import { channelId, toCategoryResults, toChannelResults } from '@/lib/search/mapper';
import type { SearchMessage, SearchResponse } from '@/lib/search/types';
import { toGameViews } from '@/lib/games/mapper';
import type { GamesMessage, GamesResponse } from '@/lib/games/types';
import { getUsersByIds } from '@/lib/helix/users';
import { toStreamViews } from '@/lib/streams/mapper';
import {
  clearLiveBaseline,
  getLiveBaseline,
  newlyLive,
  setLiveBaseline,
} from '@/lib/streams/liveSet';
import { loginFromNotificationId, notificationIdFor } from '@/lib/streams/notifications';
import { clearFollowedCache, setFollowedCache } from '@/lib/streams/cache';
import type { StreamView, StreamsMessage, StreamsResponse } from '@/lib/streams/types';
import {
  getMutedChannels,
  getNotificationSettings,
  NOTIFICATIONS_KEY,
} from '@/lib/settings/storage';
import { t } from '@/lib/i18n/messages';
import { applyStoredLanguage } from '@/lib/i18n/apply';

const TOKEN_VALIDATION_ALARM = 'auth-token-validate';
const POLL_ALARM = 'followed-streams-poll';
const BADGE_COLOR = '#7C5CFC';

const helixClient: HelixClient = createHelixClient({
  getAccessToken: async () => (await getSession())?.accessToken ?? null,
  onUnauthorized: () => clearSession(),
});

const TOP_STREAMS_PAGE_SIZE = 20;
const TOP_GAMES_PAGE_SIZE = 20;
const SEARCH_PAGE_SIZE = 20;
const FOLLOWED_CHANNELS_PAGE_SIZE = 100;

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
    title: t('notificationLiveTitle', [stream.channel]),
    message: stream.game ? `${stream.game} — ${stream.title}` : stream.title,
  });
}

function loadFollowed(userId: string) {
  return getFollowedStreams(helixClient, userId).then((streams) => ({ streams }));
}

async function commitFollowed(streams: StreamView[]) {
  await setLiveBaseline(streams);
  await setFollowedCache(streams);
  await setBadge(streams.length);
}

async function pollFollowedStreams(notify: boolean) {
  await applyStoredLanguage();
  const res = await respondWithStreams(loadFollowed);
  if (!res.ok) {
    if (res.error === 'not_connected') await setBadge(0);
    return;
  }

  if (notify && (await getNotificationSettings()).enabled) {
    const baseline = await getLiveBaseline();
    const muted = new Set(await getMutedChannels());
    for (const stream of newlyLive(baseline, res.streams)) {
      if (!muted.has(stream.userId)) notifyLive(stream);
    }
  }

  await commitFollowed(res.streams);
}

async function schedulePolling() {
  const { intervalMinutes } = await getNotificationSettings();
  browser.alarms.create(POLL_ALARM, { periodInMinutes: intervalMinutes });
}

async function respondWithTopGames(cursor?: string): Promise<GamesResponse> {
  if (!(await getSession())) return { ok: false, error: 'not_connected' };
  try {
    const { games, cursor: next } = await getTopGames(helixClient, {
      first: TOP_GAMES_PAGE_SIZE,
      after: cursor,
    });
    return { ok: true, games: toGameViews(games), cursor: next };
  } catch (err) {
    if (err instanceof HelixAuthError) return { ok: false, error: 'not_connected' };
    return { ok: false, error: 'fetch_failed' };
  }
}

async function respondWithSearch(query: string, liveOnly: boolean): Promise<SearchResponse> {
  if (!(await getSession())) return { ok: false, error: 'not_connected' };
  try {
    const [channels, categories] = await Promise.all([
      searchChannels(helixClient, { query, liveOnly, first: SEARCH_PAGE_SIZE }),
      searchCategories(helixClient, { query, first: SEARCH_PAGE_SIZE }),
    ]);
    // /search/channels carries no viewer count, so ask /streams for the ones
    // found; that answer also settles which of them are actually live.
    const liveStreams = await getStreamsByUserIds(helixClient, channels.map(channelId));
    return {
      ok: true,
      channels: toChannelResults(channels, liveStreams),
      categories: toCategoryResults(categories),
    };
  } catch (err) {
    if (err instanceof HelixAuthError) return { ok: false, error: 'not_connected' };
    return { ok: false, error: 'fetch_failed' };
  }
}

async function respondWithFollowedChannels(cursor?: string): Promise<ChannelsResponse> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'not_connected' };
  try {
    const { channels, cursor: next } = await getFollowedChannels(helixClient, {
      userId: session.userId,
      first: FOLLOWED_CHANNELS_PAGE_SIZE,
      after: cursor,
    });
    return {
      ok: true,
      channels: channels.map((c) => ({
        id: c.broadcaster_id,
        login: c.broadcaster_login,
        name: c.broadcaster_name,
      })),
      cursor: next,
    };
  } catch (err) {
    if (err instanceof HelixAuthError) return { ok: false, error: 'not_connected' };
    return { ok: false, error: 'fetch_failed' };
  }
}

type AppMessage = AuthMessage | StreamsMessage | GamesMessage | SearchMessage | ChannelsMessage;
type AppResponse =
  AuthResponse | StreamsResponse | GamesResponse | SearchResponse | ChannelsResponse;

async function handleMessage(message: AppMessage): Promise<AppResponse> {
  switch (message.type) {
    case 'auth/getStatus':
      return { ok: true, status: await getStatus() };
    case 'auth/login': {
      const res = await login();
      if (res.ok && res.status.connected) await pollFollowedStreams(false);
      return res;
    }
    case 'auth/logout': {
      const res = await logout();
      await clearLiveBaseline();
      await clearFollowedCache();
      await setBadge(0);
      return res;
    }
    case 'streams/getFollowed': {
      const res = await respondWithStreams(loadFollowed);
      if (res.ok) await commitFollowed(res.streams);
      return res;
    }
    case 'streams/getTop':
      return respondWithStreams(() =>
        getTopStreams(helixClient, { first: TOP_STREAMS_PAGE_SIZE, after: message.cursor }),
      );
    case 'streams/getByGame':
      return respondWithStreams(() =>
        getTopStreams(helixClient, {
          first: TOP_STREAMS_PAGE_SIZE,
          after: message.cursor,
          gameId: message.gameId,
        }),
      );
    case 'games/getTop':
      return respondWithTopGames(message.cursor);
    case 'search/run':
      return respondWithSearch(message.query, message.liveOnly);
    case 'channels/getFollowed':
      return respondWithFollowedChannels(message.cursor);
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
