import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { AuthMessage, AuthResponse } from '@/lib/auth/types';

type ViewState =
  | { kind: 'loading' }
  | { kind: 'connected'; login: string }
  | { kind: 'disconnected' }
  | { kind: 'error'; code: string };

async function sendAuthMessage(message: AuthMessage): Promise<AuthResponse> {
  return browser.runtime.sendMessage(message);
}

function toViewState(response: AuthResponse): ViewState {
  if (!response.ok) return { kind: 'error', code: response.error };
  return response.status.connected
    ? { kind: 'connected', login: response.status.login }
    : { kind: 'disconnected' };
}

function errorMessage(code: string): string {
  return browser.i18n.getMessage(
    code === 'auth_cancelled' ? 'authErrorCancelled' : 'authErrorGeneric',
  );
}

function App() {
  const [state, setState] = useState<ViewState>({ kind: 'loading' });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    sendAuthMessage({ type: 'auth/getStatus' })
      .then((res) => setState(toViewState(res)))
      .catch(() => setState({ kind: 'error', code: 'auth_failed' }));
  }, []);

  async function runAuthAction(message: AuthMessage) {
    setPending(true);
    try {
      const res = await sendAuthMessage(message);
      setState(toViewState(res));
    } catch {
      setState({ kind: 'error', code: 'auth_failed' });
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      aria-live="polite"
      className="flex w-80 flex-col items-center justify-center gap-3 p-6 text-sm"
    >
      {state.kind === 'loading' && (
        <p className="text-neutral-500 dark:text-neutral-400">
          {browser.i18n.getMessage('authLoading')}
        </p>
      )}

      {state.kind === 'connected' && (
        <>
          <p className="text-neutral-700 dark:text-neutral-300">
            {browser.i18n.getMessage('authConnectedAs', [state.login])}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => runAuthAction({ type: 'auth/logout' })}
            className="rounded bg-neutral-200 px-4 py-2 font-medium disabled:opacity-50 dark:bg-neutral-800"
          >
            {browser.i18n.getMessage(pending ? 'authDisconnectingButton' : 'authDisconnectButton')}
          </button>
        </>
      )}

      {state.kind === 'disconnected' && (
        <button
          type="button"
          disabled={pending}
          onClick={() => runAuthAction({ type: 'auth/login' })}
          className="rounded bg-purple-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {browser.i18n.getMessage(pending ? 'authConnectingButton' : 'authConnectButton')}
        </button>
      )}

      {state.kind === 'error' && (
        <>
          <p className="text-red-600 dark:text-red-400">{errorMessage(state.code)}</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => runAuthAction({ type: 'auth/login' })}
            className="rounded bg-purple-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {browser.i18n.getMessage('authRetryButton')}
          </button>
        </>
      )}
    </div>
  );
}

export default App;
