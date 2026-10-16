const PREFIX = 'live:';

export function notificationIdFor(login: string): string {
  return `${PREFIX}${login}`;
}

export function loginFromNotificationId(id: string): string | null {
  return id.startsWith(PREFIX) ? id.slice(PREFIX.length) || null : null;
}
