import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAuthorizeUrl, parseAuthRedirect, revalidateSession } from './oauth';

describe('buildAuthorizeUrl', () => {
  it('includes the implicit grant params', () => {
    const url = new URL(buildAuthorizeUrl('https://example.com/redirect', 'abc'));

    expect(url.origin + url.pathname).toBe('https://id.twitch.tv/oauth2/authorize');
    expect(url.searchParams.get('redirect_uri')).toBe('https://example.com/redirect');
    expect(url.searchParams.get('response_type')).toBe('token');
    expect(url.searchParams.get('state')).toBe('abc');
    expect(url.searchParams.get('scope')).toBe('user:read:follows');
  });
});

describe('parseAuthRedirect', () => {
  it('extracts the access token from the fragment', () => {
    const redirect = 'https://example.com/redirect#access_token=abc123&state=xyz&token_type=bearer';

    expect(parseAuthRedirect(redirect, 'xyz')).toBe('abc123');
  });

  it('throws on state mismatch', () => {
    const redirect = 'https://example.com/redirect#access_token=abc123&state=xyz';

    expect(() => parseAuthRedirect(redirect, 'other')).toThrow('state_mismatch');
  });

  it('throws the Twitch error when the user denies access', () => {
    const redirect = 'https://example.com/redirect#error=access_denied&state=xyz';

    expect(() => parseAuthRedirect(redirect, 'xyz')).toThrow('access_denied');
  });

  it('throws when the access token is missing', () => {
    const redirect = 'https://example.com/redirect#state=xyz';

    expect(() => parseAuthRedirect(redirect, 'xyz')).toThrow('missing_access_token');
  });
});

const storage = vi.hoisted(() => ({
  getSession: vi.fn(),
  setSession: vi.fn(),
  clearSession: vi.fn(),
}));
vi.mock('./storage', () => storage);

describe('revalidateSession', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    storage.getSession.mockResolvedValue({
      accessToken: 'tok',
      login: 'tester',
      userId: 'me',
      expiresAt: Date.now() + 3600000,
    });
    storage.clearSession.mockClear();
  });

  it('clears the session when Twitch rejects the token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));

    await revalidateSession();

    expect(storage.clearSession).toHaveBeenCalled();
  });

  it('keeps the session when Twitch is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await revalidateSession();

    expect(storage.clearSession).not.toHaveBeenCalled();
  });
});
