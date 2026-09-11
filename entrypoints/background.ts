import { browser } from 'wxt/browser';
import { TOKEN_VALIDATION_INTERVAL_MINUTES } from '@/lib/config';
import { getStatus, login, logout, revalidateSession } from '@/lib/auth/oauth';
import { clearSession, getSession } from '@/lib/auth/storage';
import type { AuthMessage, AuthResponse } from '@/lib/auth/types';
import { createHelixClient, type HelixClient } from '@/lib/helix/client';
import { HelixAuthError } from '@/lib/helix/types';
import { getFollowedStreams } from '@/lib/helix/streams';
import { getUsersByIds } from '@/lib/helix/users';
import { toFollowedStreamViews } from '@/lib/streams/mapper';
import type { StreamsMessage, StreamsResponse } from '@/lib/streams/types';

const TOKEN_VALIDATION_ALARM = 'auth-token-validate';

const helixClient: HelixClient = createHelixClient({
  getAccessToken: async () => (await getSession())?.accessToken ?? null,
  onUnauthorized: () => clearSession(),
});

async function getFollowedStreamsForCurrentUser(): Promise<StreamsResponse> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'not_connected' };

  try {
    const streams = await getFollowedStreams(helixClient, session.userId);
    const users = await getUsersByIds(helixClient, [...new Set(streams.map((s) => s.user_id))]);
    const usersById = new Map(users.map((u) => [u.id, u]));
    return { ok: true, streams: toFollowedStreamViews(streams, usersById) };
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
      return getFollowedStreamsForCurrentUser();
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
