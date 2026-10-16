import { describe, expect, it } from 'vitest';
import { loginFromNotificationId, notificationIdFor } from './notifications';

describe('notification id routing', () => {
  it('round-trips a channel login', () => {
    expect(loginFromNotificationId(notificationIdFor('novaplays'))).toBe('novaplays');
  });

  it('ignores ids from other notifications', () => {
    expect(loginFromNotificationId('update-available')).toBeNull();
    expect(loginFromNotificationId('')).toBeNull();
  });

  it('ignores a prefix with no login behind it', () => {
    expect(loginFromNotificationId('live:')).toBeNull();
  });
});
