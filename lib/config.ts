// Public client (no secret), provided via a WXT_ env var at build time.
// Empty until the Twitch app is registered.
export const TWITCH_CLIENT_ID: string = import.meta.env.WXT_TWITCH_CLIENT_ID ?? '';

export const HELIX_BASE_URL = 'https://api.twitch.tv/helix';
export const OAUTH_BASE_URL = 'https://id.twitch.tv/oauth2';
export const OAUTH_AUTHORIZE_URL = `${OAUTH_BASE_URL}/authorize`;
export const OAUTH_VALIDATE_URL = `${OAUTH_BASE_URL}/validate`;
export const OAUTH_REVOKE_URL = `${OAUTH_BASE_URL}/revoke`;

// Twitch does not support Authorization Code + PKCE for public clients.
export const OAUTH_RESPONSE_TYPE = 'token' as const;

export const OAUTH_SCOPES = ['user:read:follows'] as const;

// Twitch requires validating the token on startup and hourly thereafter.
export const TOKEN_VALIDATION_INTERVAL_MINUTES = 60;

// Lower bound to stay within the Helix rate limit (default 800 pts/min, 1 pt/request).
export const DEFAULT_POLLING_INTERVAL_MINUTES = 2;
