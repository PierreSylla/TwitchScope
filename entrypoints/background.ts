import { browser } from 'wxt/browser';
import { TOKEN_VALIDATION_INTERVAL_MINUTES } from '@/lib/config';
import { getStatus, login, logout, revalidateSession } from '@/lib/auth/oauth';
import type { AuthMessage, AuthResponse } from '@/lib/auth/types';

const TOKEN_VALIDATION_ALARM = 'auth-token-validate';

async function handleMessage(message: AuthMessage): Promise<AuthResponse> {
  switch (message.type) {
    case 'auth/getStatus':
      return { ok: true, status: await getStatus() };
    case 'auth/login':
      return login();
    case 'auth/logout':
      return logout();
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

    browser.runtime.onMessage.addListener((message: AuthMessage) => handleMessage(message));
  },
});
