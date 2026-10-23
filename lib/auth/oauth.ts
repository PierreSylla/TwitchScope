import { browser } from 'wxt/browser';
import {
  OAUTH_AUTHORIZE_URL,
  OAUTH_REVOKE_URL,
  OAUTH_RESPONSE_TYPE,
  OAUTH_SCOPES,
  OAUTH_VALIDATE_URL,
  TWITCH_CLIENT_ID,
} from '../config';
import { clearSession, getSession, setSession } from './storage';
import type { AuthResponse, AuthStatus } from './types';

const INVALID_TOKEN = 'invalid_token';

interface ValidateResult {
  login: string;
  userId: string;
  expiresIn: number;
}

// Logs the failure reason only (never the token) otherwise auth failures are silent.
function warnAuthError(step: string, code: string): void {
  console.warn(`[auth] ${step} failed: ${code}`);
}

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const url = new URL(OAUTH_AUTHORIZE_URL);
  url.searchParams.set('client_id', TWITCH_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', OAUTH_RESPONSE_TYPE);
  url.searchParams.set('scope', OAUTH_SCOPES.join(' '));
  url.searchParams.set('state', state);
  return url.toString();
}

export function parseAuthRedirect(redirectUrl: string, expectedState: string): string {
  const url = new URL(redirectUrl);
  const params = new URLSearchParams(url.hash.replace(/^#/, '') || url.search.replace(/^\?/, ''));

  const error = params.get('error');
  if (error) throw new Error(error);

  if (params.get('state') !== expectedState) throw new Error('state_mismatch');

  const accessToken = params.get('access_token');
  if (!accessToken) throw new Error('missing_access_token');

  return accessToken;
}

// Twitch requires "OAuth <token>", not "Bearer", for this endpoint.
async function validateToken(accessToken: string): Promise<ValidateResult> {
  const response = await fetch(OAUTH_VALIDATE_URL, {
    headers: { Authorization: `OAuth ${accessToken}` },
  });
  if (!response.ok) throw new Error(INVALID_TOKEN);

  const body = (await response.json()) as {
    login: string;
    user_id: string;
    expires_in: number;
  };
  return { login: body.login, userId: body.user_id, expiresIn: body.expires_in };
}

async function revokeToken(accessToken: string): Promise<void> {
  await fetch(OAUTH_REVOKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: TWITCH_CLIENT_ID, token: accessToken }),
  });
}

export async function getStatus(): Promise<AuthStatus> {
  const session = await getSession();
  if (!session) return { connected: false };
  if (session.expiresAt <= Date.now()) {
    await clearSession();
    return { connected: false };
  }
  return { connected: true, login: session.login };
}

export async function login(): Promise<AuthResponse> {
  const state = crypto.randomUUID();
  const redirectUri = browser.identity.getRedirectURL();

  let redirectUrl: string | undefined;
  try {
    redirectUrl = await browser.identity.launchWebAuthFlow({
      url: buildAuthorizeUrl(redirectUri, state),
      interactive: true,
    });
  } catch {
    warnAuthError('launchWebAuthFlow', 'auth_cancelled');
    return { ok: false, error: 'auth_cancelled' };
  }
  if (!redirectUrl) {
    warnAuthError('launchWebAuthFlow', 'auth_cancelled');
    return { ok: false, error: 'auth_cancelled' };
  }

  let accessToken: string;
  try {
    accessToken = parseAuthRedirect(redirectUrl, state);
  } catch (err) {
    const code = err instanceof Error ? err.message : 'auth_failed';
    warnAuthError('parseAuthRedirect', code);
    return { ok: false, error: code };
  }

  let validated: ValidateResult;
  try {
    validated = await validateToken(accessToken);
  } catch {
    warnAuthError('validateToken', 'validation_failed');
    return { ok: false, error: 'validation_failed' };
  }

  await setSession({
    accessToken,
    login: validated.login,
    userId: validated.userId,
    expiresAt: Date.now() + validated.expiresIn * 1000,
  });

  return { ok: true, status: { connected: true, login: validated.login } };
}

export async function logout(): Promise<AuthResponse> {
  const session = await getSession();
  if (session) await revokeToken(session.accessToken).catch(() => {});
  await clearSession();
  return { ok: true, status: { connected: false } };
}

// Twitch requires validating the token on startup and hourly thereafter.
export async function revalidateSession(): Promise<void> {
  const session = await getSession();
  if (!session) return;
  try {
    await validateToken(session.accessToken);
  } catch (err) {
    if (err instanceof Error && err.message === INVALID_TOKEN) {
      warnAuthError('revalidateSession', INVALID_TOKEN);
      await clearSession();
      return;
    }
    warnAuthError('revalidateSession', 'unreachable');
  }
}
