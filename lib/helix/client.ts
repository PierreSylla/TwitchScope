import { HELIX_BASE_URL, TWITCH_CLIENT_ID } from '../config';
import { HelixApiError, HelixAuthError } from './types';
import type { HelixRequestOptions, HelixResponse } from './types';

export type AccessTokenProvider = () => Promise<string | null>;

export interface HelixClientOptions {
  getAccessToken: AccessTokenProvider;
  onUnauthorized?: () => void | Promise<void>;
}

const MAX_RATE_LIMIT_RETRIES = 3;

export function createHelixClient(clientOptions: HelixClientOptions) {
  async function request<T>(options: HelixRequestOptions): Promise<HelixResponse<T>> {
    const token = await clientOptions.getAccessToken();
    if (!token) {
      throw new HelixAuthError('No Twitch access token available');
    }

    const url = new URL(`${HELIX_BASE_URL}${options.path}`);
    for (const [key, value] of Object.entries(options.searchParams ?? {})) {
      if (value === undefined) continue;
      for (const v of Array.isArray(value) ? value : [value]) {
        url.searchParams.append(key, v);
      }
    }

    const response = await fetchWithRateLimitBackoff(url, {
      headers: {
        'Client-Id': TWITCH_CLIENT_ID,
        Authorization: `Bearer ${token}`,
      },
      signal: options.signal,
    });

    if (response.status === 401) {
      await clientOptions.onUnauthorized?.();
      throw new HelixAuthError('Twitch access token rejected (401)');
    }

    if (!response.ok) {
      throw new HelixApiError(`Helix request failed: ${response.status}`, response.status);
    }

    return (await response.json()) as HelixResponse<T>;
  }

  return { request };
}

async function fetchWithRateLimitBackoff(
  url: URL,
  init: RequestInit,
  attempt = 0,
): Promise<Response> {
  const response = await fetch(url, init);

  if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
    // Ratelimit-Reset: Unix timestamp (seconds) when the bucket refills.
    const resetAt = Number(response.headers.get('Ratelimit-Reset'));
    const delayMs =
      Number.isFinite(resetAt) && resetAt > 0
        ? Math.max(0, resetAt * 1000 - Date.now())
        : 2 ** attempt * 500;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return fetchWithRateLimitBackoff(url, init, attempt + 1);
  }

  return response;
}
