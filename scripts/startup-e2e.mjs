// Verifies the stored session survives a real browser restart: the same profile
// is relaunched and the popup must open straight onto the followed list, with
// the badge and notifications working again without a trip through Twitch.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EXT = '/home/pierre/dev/twitchscope/.output/chrome-mv3';
const PORT = 9347;
const POLL_ALARM = 'followed-streams-poll';
const SESSION_KEY = 'twitchSession';
const profile = mkdtempSync(join(tmpdir(), 'twitchscope-startup-'));

// Twitch's hosts are redirected to local ports so unmocked traffic is
// deterministic: HELIX_PORT counts connection attempts (TLS then fails), and
// nothing listens on ID_PORT, so token validation gets a hard refusal.
const HELIX_PORT = 9443;
const ID_PORT = 9444;
let helixConnects = 0;
const helixCounter = createServer((socket) => {
  helixConnects++;
  socket.destroy();
});
await new Promise((resolve) => helixCounter.listen(HELIX_PORT, '127.0.0.1', resolve));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const targets = async () => (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();

function launch() {
  return spawn('/usr/bin/chromium', [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    `--disable-extensions-except=${EXT}`,
    `--load-extension=${EXT}`,
    '--no-first-run',
    '--screen-info={1920x1080}',
    `--host-resolver-rules=MAP api.twitch.tv 127.0.0.1:${HELIX_PORT}, MAP id.twitch.tv 127.0.0.1:${ID_PORT}`,
    'about:blank',
  ]);
}

let chrome = launch();

async function waitFor(predicate, label, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const found = (await targets()).find(predicate);
      if (found) return found;
    } catch {
      /* browser not up yet */
    }
    await sleep(150);
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function open(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const consoleErrors = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      consoleErrors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
    }
    const p = pending.get(m.id);
    if (p) {
      pending.delete(m.id);
      if (m.error) p.reject(new Error(JSON.stringify(m.error)));
      else p.resolve(m.result);
    }
  });
  const send = (method, params = {}) => {
    const i = ++id;
    ws.send(JSON.stringify({ id: i, method, params }));
    return new Promise((resolve, reject) => pending.set(i, { resolve, reject }));
  };
  return {
    send,
    consoleErrors,
    close: () => ws.close(),
    async eval(expression) {
      const r = await send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (r.exceptionDetails) {
        throw new Error(`eval failed: ${r.exceptionDetails.exception?.description ?? ''}`);
      }
      return r.result.value;
    },
  };
}

const INSTALL_STUBS = String.raw`
(() => {
  self.__live = ['alice', 'bob', 'carol'];
  self.__notified = [];
  self.__pollCount = 0;

  const stream = (login) => ({
    id: 'stream-' + login,
    user_id: 'u-' + login,
    user_login: login,
    user_name: login.charAt(0).toUpperCase() + login.slice(1) + 'Plays',
    game_id: 'g1',
    game_name: 'Test Game',
    type: 'live',
    title: 'Streaming as ' + login,
    viewer_count: 1000,
    started_at: new Date(Date.now() - 600000).toISOString(),
    thumbnail_url: 'https://example.invalid/{width}x{height}.jpg',
  });

  self.fetch = async (input) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw);
    const json = (body) => new Response(JSON.stringify(body), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
    if (url.pathname.endsWith('/oauth2/validate')) {
      return json({ client_id: 'test', login: 'tester', user_id: 'me', expires_in: 99999 });
    }
    if (url.pathname.endsWith('/oauth2/revoke')) return json({});
    if (url.pathname.endsWith('/helix/streams/followed')) {
      self.__pollCount++;
      return json({ data: self.__live.map(stream), pagination: {} });
    }
    if (url.pathname.endsWith('/helix/users')) {
      return json({ data: url.searchParams.getAll('id').map((id) => ({
        id, login: id, display_name: id, profile_image_url: 'https://example.invalid/a.png',
      })) });
    }
    if (url.pathname.endsWith('/helix/streams')) return json({ data: [], pagination: {} });
    return new Response('unexpected ' + raw, { status: 500 });
  };

  const realCreate = chrome.notifications.create.bind(chrome.notifications);
  chrome.notifications.create = (id, options, cb) => {
    self.__notified.push({ id, title: options.title, message: options.message });
    return realCreate(id, options, cb);
  };
  return 'stubs installed';
})()
`;

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

let sw;

/**
 * A service-worker target can go stale between listing and evaluating, which
 * surfaces as "chrome is not defined"; retry until the context is live.
 */
async function attachServiceWorker() {
  for (let attempt = 0; attempt < 15; attempt++) {
    const target = await waitFor(
      (t) => t.type === 'service_worker' && t.url.includes('background'),
      'service worker',
    );
    try {
      const session = await open(target.webSocketDebuggerUrl);
      await session.send('Runtime.enable');
      if ((await session.eval('typeof chrome')) === 'object') return session;
    } catch {
      /* stale target, list again */
    }
    await sleep(400);
  }
  throw new Error('could not attach to a live service worker');
}

async function restartBrowser() {
  const exited = new Promise((resolve) => chrome.once('exit', resolve));
  chrome.kill();
  await exited;
  await sleep(2000); // let the port free up and leveldb settle
  chrome = launch();
  sw = await attachServiceWorker();
}

async function openActionPopup() {
  await sw.eval('(async () => { await chrome.action.openPopup(); return 1; })()');
  const target = await waitFor((t) => t.url.includes('popup.html'), 'action popup');
  const popup = await open(target.webSocketDebuggerUrl);
  await popup.send('Runtime.enable');
  return popup;
}

const cardHrefs = (popup) =>
  popup.eval(
    "(() => [...document.querySelectorAll('a[href^=\"https://twitch.tv/\"]')].map((a) => a.getAttribute('href')))()",
  );

async function triggerPoll(expectedPolls) {
  await sw.eval(
    `(async () => { await chrome.alarms.create('${POLL_ALARM}', { periodInMinutes: 0.1 }); return 1; })()`,
  );
  const deadline = Date.now() + 40000;
  while (Date.now() < deadline) {
    if ((await sw.eval('(() => self.__pollCount)()')) >= expectedPolls) {
      await sleep(500);
      await sw.eval(`(async () => { await chrome.alarms.clear('${POLL_ALARM}'); return 1; })()`);
      return;
    }
    await sleep(300);
  }
  throw new Error(`poll ${expectedPolls} never happened`);
}

try {
  console.log('\n[1] First run: connect once, confirm the list renders');
  sw = await attachServiceWorker();
  console.log(' ', await sw.eval(INSTALL_STUBS));
  const extId = await sw.eval('(() => chrome.runtime.id)()');

  await sw.eval(`(async () => {
    await chrome.storage.sync.set({ density: 'comfortable', theme: 'auto', language: 'en',
      notifications: { enabled: true, intervalMinutes: 15 } });
    await chrome.storage.local.set({ ${SESSION_KEY}: { accessToken: 'faketoken', userId: 'me',
      login: 'tester', scopes: ['user:read:follows'], expiresAt: Date.now() + 7 * 24 * 3600 * 1000 } });
    return 1; })()`);

  let popup = await openActionPopup();
  await sleep(2000);
  const firstRun = await cardHrefs(popup);
  check(
    'Connected popup lists the followed channels',
    firstRun.length === 3,
    `${firstRun.length} cards`,
  );
  popup.close();
  await sleep(1500); // give leveldb time to flush the token before the kill

  console.log('\n[2] Restart the browser on the same profile');
  helixConnects = 0;
  await restartBrowser();
  await sleep(3000); // let onStart finish: reschedule, revalidate, seed

  const persisted = await sw.eval(
    `(async () => (await chrome.storage.local.get('${SESSION_KEY}'))['${SESSION_KEY}'] ?? null)()`,
  );
  check(
    'The token survives the restart in local storage',
    persisted?.accessToken === 'faketoken' && persisted?.login === 'tester',
    JSON.stringify(persisted && { login: persisted.login, userId: persisted.userId }),
  );

  const inSession = await sw.eval(
    `(async () => (await chrome.storage.session.get('${SESSION_KEY}'))['${SESSION_KEY}'] ?? null)()`,
  );
  check(
    'Session storage was indeed wiped by the restart (the old bug)',
    inSession === null,
    JSON.stringify(inSession),
  );

  const alarm = await sw.eval(`(async () => await chrome.alarms.get('${POLL_ALARM}'))()`);
  check('Startup re-armed the poll alarm', !!alarm, JSON.stringify(alarm?.periodInMinutes));

  check(
    'Startup polled Helix on its own, with no popup opened',
    helixConnects > 0,
    `${helixConnects} connection(s) to the Helix host`,
  );

  // The restart left Twitch unreachable, which is the case that used to sign
  // the user out: validation failed and the handler dropped the session.
  const survivedFailedValidation = await sw.eval(
    `(async () => (await chrome.storage.local.get('${SESSION_KEY}'))['${SESSION_KEY}'] ?? null)()`,
  );
  check(
    'A failed revalidation at startup keeps the session',
    survivedFailedValidation?.accessToken === 'faketoken',
    JSON.stringify(survivedFailedValidation && { login: survivedFailedValidation.login }),
  );

  console.log('\n[3] The popup opens straight onto the list, with no Connect screen');
  console.log(' ', await sw.eval(INSTALL_STUBS));
  popup = await openActionPopup();
  await sleep(2500);
  const afterRestart = await cardHrefs(popup);
  check(
    'Cards render after the restart without re-authorising',
    afterRestart.length === 3,
    JSON.stringify(afterRestart),
  );

  const text = await popup.eval('(() => document.body.innerText)()');
  check(
    'No "Connect with Twitch" button on screen',
    !/Connect with Twitch|Se connecter avec Twitch/.test(text),
    JSON.stringify(text.slice(0, 50)),
  );

  const status = await popup.eval(
    "(async () => await chrome.runtime.sendMessage({ type: 'auth/getStatus' }))()",
  );
  check(
    'auth/getStatus reports the restored session',
    status?.ok === true && status.status?.connected === true && status.status.login === 'tester',
    JSON.stringify(status),
  );

  const badge = await sw.eval('(async () => await chrome.action.getBadgeText({}))()');
  check(
    'Badge shows the live count after the restart',
    badge === '3',
    `badge=${JSON.stringify(badge)}`,
  );

  console.log('\n[4] Notifications work after the restart, with no Connect click');
  await sw.eval(
    "(() => { self.__live = ['alice', 'bob', 'carol', 'dave']; self.__notified = []; return 1; })()",
  );
  await triggerPoll((await sw.eval('(() => self.__pollCount)()')) + 1);
  const notified = await sw.eval('(() => self.__notified)()');
  check(
    'A channel going live after the restart raises a notification',
    notified.length === 1 && /DavePlays/.test(notified[0].title),
    JSON.stringify(notified.map((n) => n.title)),
  );
  const badgeAfter = await sw.eval('(async () => await chrome.action.getBadgeText({}))()');
  check('Badge follows the new count', badgeAfter === '4', `badge=${JSON.stringify(badgeAfter)}`);

  console.log('\n[5] Disconnecting still clears the stored token');
  await popup.eval("(async () => await chrome.runtime.sendMessage({ type: 'auth/logout' }))()");
  await sleep(1200);
  const afterLogout = await sw.eval(
    `(async () => (await chrome.storage.local.get('${SESSION_KEY}'))['${SESSION_KEY}'] ?? null)()`,
  );
  check(
    'Logout removes the token from local storage',
    afterLogout === null,
    JSON.stringify(afterLogout),
  );
  const badgeLoggedOut = await sw.eval('(async () => await chrome.action.getBadgeText({}))()');
  check(
    'Logout clears the badge',
    badgeLoggedOut === '',
    `badge=${JSON.stringify(badgeLoggedOut)}`,
  );

  console.log('\n[6] A logged-out restart really does show the Connect screen');
  await restartBrowser();
  console.log(' ', await sw.eval(INSTALL_STUBS));
  popup = await openActionPopup();
  await sleep(2000);
  const loggedOutText = await popup.eval('(() => document.body.innerText)()');
  check(
    'Connect screen shown when there is no stored token',
    /Connect with Twitch|Se connecter avec Twitch/.test(loggedOutText),
    JSON.stringify(loggedOutText.slice(0, 50)),
  );

  check(
    'No console errors in the popup',
    popup.consoleErrors.length === 0,
    popup.consoleErrors.slice(0, 2).join(' | '),
  );

  console.log(`\nextension id: ${extId}`);
  console.log('----------------------------------------');
  const failed = results.filter((r) => !r.pass);
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('FAILED:', failed.map((f) => f.name).join('; '));
    process.exitCode = 1;
  }
} catch (err) {
  console.error('\nHARNESS ERROR:', err.message);
  process.exitCode = 1;
} finally {
  chrome.kill();
  helixCounter.close();
  rmSync(profile, { recursive: true, force: true });
}
