export interface TwitchSession {
  accessToken: string;
  login: string;
  userId: string;
  expiresAt: number;
}

export type AuthStatus = { connected: false } | { connected: true; login: string };

export type AuthMessage =
  { type: 'auth/getStatus' } | { type: 'auth/login' } | { type: 'auth/logout' };

export type AuthResponse = { ok: true; status: AuthStatus } | { ok: false; error: string };
