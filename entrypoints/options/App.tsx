import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { sendMessage } from '@/lib/messaging';
import type { AuthMessage, AuthResponse } from '@/lib/auth/types';

type AccountState =
  { kind: 'loading' } | { kind: 'connected'; login: string } | { kind: 'disconnected' };

async function sendAuthMessage(message: AuthMessage): Promise<AuthResponse> {
  return sendMessage<AuthResponse>(message);
}

function AccountSection() {
  const [state, setState] = useState<AccountState>({ kind: 'loading' });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    sendAuthMessage({ type: 'auth/getStatus' })
      .then((res) =>
        setState(
          res.ok && res.status.connected
            ? { kind: 'connected', login: res.status.login }
            : { kind: 'disconnected' },
        ),
      )
      .catch(() => setState({ kind: 'disconnected' }));
  }, []);

  async function handleDisconnect() {
    setPending(true);
    const res = await sendAuthMessage({ type: 'auth/logout' }).catch((): AuthResponse => ({
      ok: false,
      error: 'auth_failed',
    }));
    setPending(false);
    setState(
      res.ok && res.status.connected
        ? { kind: 'connected', login: res.status.login }
        : { kind: 'disconnected' },
    );
  }

  async function handleConnect() {
    setPending(true);
    const res = await sendAuthMessage({ type: 'auth/login' }).catch((): AuthResponse => ({
      ok: false,
      error: 'auth_failed',
    }));
    setPending(false);
    setState(
      res.ok && res.status.connected
        ? { kind: 'connected', login: res.status.login }
        : { kind: 'disconnected' },
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {browser.i18n.getMessage('settingsAccountLabel')}
      </h2>

      {state.kind === 'loading' && (
        <p className="text-sm text-ink-muted">{browser.i18n.getMessage('authLoading')}</p>
      )}

      {state.kind === 'connected' && (
        <div className="flex items-center justify-between rounded-xl border border-hairline bg-tile p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-hairline font-mono text-xs font-bold text-ink-muted">
              {state.login.slice(0, 2).toUpperCase()}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-ink">{state.login}</span>
              <span className="text-xs text-ink-muted">
                {browser.i18n.getMessage('settingsConnectedWith')}
              </span>
            </div>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={handleDisconnect}
            className="rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {browser.i18n.getMessage(pending ? 'authDisconnectingButton' : 'authDisconnectButton')}
          </button>
        </div>
      )}

      {state.kind === 'disconnected' && (
        <div className="flex items-center justify-between rounded-xl border border-hairline bg-tile p-3">
          <span className="text-sm text-ink-muted">
            {browser.i18n.getMessage('settingsConnectPrompt')}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={handleConnect}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {browser.i18n.getMessage(pending ? 'authConnectingButton' : 'authConnectButton')}
          </button>
        </div>
      )}
    </section>
  );
}

function App() {
  return (
    <div className="mx-auto max-w-[640px] overflow-hidden rounded-xl border border-hairline bg-panel shadow-[0_1px_3px_rgba(0,0,0,.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,.3)]">
      <div className="border-b border-hairline px-8 py-6">
        <h1 className="text-lg font-bold text-ink">
          {browser.i18n.getMessage('settingsPageTitle')}
        </h1>
      </div>
      <div className="flex flex-col gap-8 p-8">
        <AccountSection />
      </div>
    </div>
  );
}

export default App;
