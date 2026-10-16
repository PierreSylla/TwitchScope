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
import type { StreamsMessage, StreamsResponse } from '@/lib/streams/types';

const TOKEN_VALIDATION_ALARM = 'auth-token-validate';

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

type AppMessage = AuthMessage | StreamsMessage;
type AppResponse = AuthResponse | StreamsResponse;

async function handleMessage(message: AppMessage): Promise<AppResponse> {
  switch (message.type) {
    case 'auth/getStatus':
      return { ok: true, status: await getStatus() };
    case 'auth/login':
      return login();
    case 'auth/logout':
      return logout();
    case 'streams/getFollowed':
      return respondWithStreams(async (userId) => ({
        streams: await getFollowedStreams(helixClient, userId),
      }));
    case 'streams/getTop':
      return respondWithStreams(() =>
        getTopStreams(helixClient, { first: TOP_STREAMS_PAGE_SIZE, after: message.cursor }),
      );
  }
}

function scheduleTokenValidation() {
  browser.alarms.create(TOKEN_VALIDATION_ALARM, {
    periodInMinutes: TOKEN_VALIDATION_INTERVAL_MINUTES,
  });
  void revalidateSession();
}

export default defineBackground({
  type: 'module',
  main() {
    browser.runtime.onInstalled.addListener(scheduleTokenValidation);
    browser.runtime.onStartup.addListener(scheduleTokenValidation);

    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === TOKEN_VALIDATION_ALARM) void revalidateSession();
    });

    browser.runtime.onMessage.addListener((message: AppMessage) => handleMessage(message));
  },
});
