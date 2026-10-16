import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EXT = '/home/pierre/dev/twitchscope/.output/chrome-mv3';
const PORT = 9333;
const profile = mkdtempSync(join(tmpdir(), 'twitchscope-cdp-'));

const chrome = spawn(
  '/usr/bin/chromium',
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    `--disable-extensions-except=${EXT}`,
    `--load-extension=${EXT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1400,1040',
    '--screen-info={1920x1080}',
    'about:blank',
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function targets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  return res.json();
}

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

async function waitGone(predicate, label, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (!(await targets()).some(predicate)) return;
    await sleep(150);
  }
  throw new Error(`timed out waiting for ${label} to disappear`);
}

class Session {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.consoleErrors = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        this.consoleErrors.push(
          msg.params.exceptionDetails.exception?.description ?? 'exceptionThrown',
        );
      }
      const p = this.pending.get(msg.id);
      if (p) {
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
        else p.resolve(msg.result);
      }
    });
  }

  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true });
      ws.addEventListener('error', rej, { once: true });
    });
    return new Session(ws);
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  async eval(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error(`eval failed: ${d.exception?.description ?? JSON.stringify(d)}`);
    }
    return r.result.value;
  }

  close() {
    this.ws.close();
  }
}

const INSTALL_MOCK = String.raw`
(() => {
  self.__mock = { followed: 3, topPages: [] };
  self.__log = [];
  const stream = (i, tag) => ({
    id: tag + '-' + i,
    user_id: 'u-' + tag + '-' + i,
    user_login: tag + 'chan' + i,
    user_name: tag.toUpperCase() + ' Channel ' + i,
    game_id: 'g' + i,
    game_name: 'Game ' + (i % 5),
    type: 'live',
    title: 'Stream title ' + i + ' (' + tag + ') long enough that it wraps onto a second line',
    viewer_count: 100000 - i * 137,
    started_at: new Date(Date.now() - (i + 1) * 37 * 60000).toISOString(),
    thumbnail_url: 'https://example.invalid/{width}x{height}.jpg',
  });
  self.fetch = async (input) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw);
    self.__log.push(url.pathname + (url.search || ''));
    const json = (body) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    if (url.pathname.endsWith('/oauth2/validate')) {
      return json({ client_id: 'test', login: 'tester', user_id: 'me',
        scopes: ['user:read:follows'], expires_in: 99999 });
    }
    if (url.pathname.endsWith('/helix/streams/followed')) {
      return json({
        data: Array.from({ length: self.__mock.followed }, (_, i) => stream(i, 'fol')),
        pagination: {},
      });
    }
    if (url.pathname.endsWith('/helix/streams')) {
      const after = url.searchParams.get('after');
      const pageIndex = after ? Number(after.replace('cursor', '')) : 0;
      const page = self.__mock.topPages[pageIndex] ?? { count: 0, next: false };
      return json({
        data: Array.from({ length: page.count }, (_, i) => stream(pageIndex * 100 + i, 'top')),
        pagination: page.next ? { cursor: 'cursor' + (pageIndex + 1) } : {},
      });
    }
    if (url.pathname.endsWith('/helix/users')) {
      return json({
        data: url.searchParams.getAll('id').map((id) => ({
          id, login: id, display_name: id,
          profile_image_url: 'https://example.invalid/a.png',
        })),
      });
    }
    return new Response('unexpected ' + raw, { status: 500 });
  };
  return 'mock installed';
})()
`;

const SEED_SESSION = String.raw`
(async () => {
  await chrome.storage.session.set({
    twitchSession: {
      accessToken: 'faketoken',
      userId: 'me',
      login: 'tester',
      scopes: ['user:read:follows'],
      expiresAt: Date.now() + 3600000,
    },
  });
  return chrome.runtime.id;
})()
`;

const PROBE = String.raw`
(() => {
  const scrollers = [...document.querySelectorAll('div')].filter(
    (el) => getComputedStyle(el).overflowY === 'auto'
  );
  const list = scrollers[0];
  const text = (el) => (el?.textContent || '').trim();
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    pageScrollHeight: document.documentElement.scrollHeight,
    pageScrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
    cards: document.querySelectorAll('a[href^="https://twitch.tv/"]').length,
    firstCardHref: document.querySelector('a[href^="https://twitch.tv/"]')?.getAttribute('href') ?? null,
    tabs: [...document.querySelectorAll('nav button')].map((b) => ({
      label: text(b), current: b.getAttribute('aria-current'), disabled: b.disabled,
    })),
    buttonLabels: [...document.querySelectorAll('button')].map(text),
    announce: text(document.querySelector('[aria-live]')),
    list: list
      ? {
          maxHeight: getComputedStyle(list).maxHeight,
          clientHeight: list.clientHeight,
          scrollHeight: list.scrollHeight,
          scrolls: list.scrollHeight > list.clientHeight + 1,
          firstCardHeight: Math.round(
            list.querySelector('a')?.getBoundingClientRect().height ?? 0
          ),
        }
      : null,
  };
})()
`;

const clickByText = (re) => String.raw`
(() => {
  const btn = [...document.querySelectorAll('button')].find((b) =>
    ${re}.test((b.textContent || '').trim())
  );
  if (!btn) return 'not-found';
  if (btn.disabled) return 'disabled';
  btn.click();
  return 'clicked';
})()
`;

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

let sw;
let allConsoleErrors = [];

async function withPopup(mock, density, fn) {
  await sw.eval(
    `(() => { Object.assign(self.__mock, ${JSON.stringify(mock)}); self.__log = []; return 1; })()`,
  );
  await sw.eval(
    `(async () => { await chrome.storage.sync.set({ density: '${density}' }); return 1; })()`,
  );
  await sw.eval('(async () => { await chrome.action.openPopup(); return 1; })()');
  const t = await waitFor((t) => t.url.includes('popup.html'), 'popup target');
  const popup = await Session.open(t.webSocketDebuggerUrl);
  await popup.send('Runtime.enable');
  try {
    return await fn(popup);
  } finally {
    allConsoleErrors = allConsoleErrors.concat(popup.consoleErrors);
    await popup.eval('(() => { window.close(); return 1; })()').catch(() => {});
    popup.close();
    await waitGone((x) => x.url.includes('popup.html'), 'popup');
  }
}

async function waitUntil(popup, predicate, label, timeout = 10000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    last = await popup.eval(PROBE);
    if (predicate(last)) return last;
    await sleep(100);
  }
  throw new Error(`timed out: ${label} (last: ${JSON.stringify(last)})`);
}

try {
  const swTarget = await waitFor(
    (t) => t.type === 'service_worker' && t.url.includes('background'),
    'service worker',
  );
  sw = await Session.open(swTarget.webSocketDebuggerUrl);
  await sw.send('Runtime.enable');
  console.log(await sw.eval(INSTALL_MOCK));
  console.log('extension id:', await sw.eval(SEED_SESSION));

  // ---------------------------------------------------------------- scenario 1
  console.log('\n[1] Followed tab (F2 regression) + tab navigation, comfortable');
  await withPopup(
    { followed: 3, topPages: [{ count: 1, next: false }] },
    'comfortable',
    async (p) => {
      const loaded = await waitUntil(p, (s) => s.cards === 3, 'followed list loaded');
      check('Followed renders 3 cards', loaded.cards === 3);
      check(
        'Followed tab marked current',
        loaded.tabs[0].current === 'page' && loaded.tabs[1].current === null,
        JSON.stringify(loaded.tabs.map((t) => [t.label, t.current, t.disabled])),
      );
      check(
        'Browse/Search disabled, Followed/Popular enabled',
        !loaded.tabs[0].disabled &&
          !loaded.tabs[1].disabled &&
          loaded.tabs[2].disabled &&
          loaded.tabs[3].disabled,
      );

      check(
        'Popular tab click',
        (await p.eval(clickByText('/^(Popular|Populaire)$/'))) === 'clicked',
      );
      const pop = await waitUntil(
        p,
        (s) => s.cards === 1 && s.firstCardHref?.includes('topchan'),
        'popular loaded',
      );
      check(
        'Popular tab now current',
        pop.tabs[1].current === 'page' && pop.tabs[0].current === null,
      );
      check(
        'Popular shows top streams',
        pop.cards === 1,
        `${pop.cards} cards, ${pop.firstCardHref}`,
      );
      check(
        'No "Load more" when there is no cursor',
        !pop.buttonLabels.some((l) => /Load more|Charger plus/.test(l)),
      );
      check(
        'Short list: page does not scroll',
        !pop.pageScrolls,
        `innerHeight=${pop.innerHeight} pageScrollHeight=${pop.pageScrollHeight}`,
      );
      check(
        'Short list: list does not scroll',
        !pop.list.scrolls,
        `client=${pop.list.clientHeight} scroll=${pop.list.scrollHeight}`,
      );
    },
  );

  // ---------------------------------------------------------------- scenario 2
  console.log('\n[2] Popular long list + Load more, comfortable');
  await withPopup(
    {
      followed: 3,
      topPages: [
        { count: 20, next: true },
        { count: 20, next: true },
        { count: 5, next: false },
      ],
    },
    'comfortable',
    async (p) => {
      await waitUntil(p, (s) => s.cards === 3, 'followed loaded');
      await p.eval(clickByText('/^(Popular|Populaire)$/'));
      const page1 = await waitUntil(p, (s) => s.cards === 20, 'popular page 1');

      check('Page 1 renders 20 cards', page1.cards === 20);
      check('List capped at 480px', page1.list.maxHeight === '480px', page1.list.maxHeight);
      check(
        'List scrolls internally',
        page1.list.scrolls,
        `client=${page1.list.clientHeight} scroll=${page1.list.scrollHeight}`,
      );
      check(
        'Page itself does NOT scroll (rounded corner safe)',
        !page1.pageScrolls,
        `innerHeight=${page1.innerHeight} pageScrollHeight=${page1.pageScrollHeight}`,
      );
      check(
        'Cards not squished by the flex cap',
        page1.list.firstCardHeight > 200,
        `first card ${page1.list.firstCardHeight}px tall`,
      );
      check(
        '"Load more" present',
        page1.buttonLabels.some((l) => /Load more|Charger plus/.test(l)),
      );
      check('Loaded announcement', /20/.test(page1.announce), JSON.stringify(page1.announce));

      check(
        'Load more click',
        (await p.eval(clickByText('/Load more|Charger plus/'))) === 'clicked',
      );
      const page2 = await waitUntil(p, (s) => s.cards === 40, 'popular page 2 appended');
      check('Page 2 appended → 40 cards', page2.cards === 40);
      check('Cap still 480px after Load more', page2.list.maxHeight === '480px');
      check('Page still does not scroll after Load more', !page2.pageScrolls);
      check(
        '"Load more" still present (cursor remains)',
        page2.buttonLabels.some((l) => /Load more|Charger plus/.test(l)),
      );

      await p.eval(clickByText('/Load more|Charger plus/'));
      const page3 = await waitUntil(p, (s) => s.cards === 45, 'popular final page');
      check('Final page appended → 45 cards', page3.cards === 45);
      check(
        '"Load more" disappears on the last page',
        !page3.buttonLabels.some((l) => /Load more|Charger plus/.test(l)),
        JSON.stringify(page3.buttonLabels),
      );

      const log = await sw.eval('(() => self.__log)()');
      const topCalls = log.filter((l) => l.includes('/helix/streams?'));
      check(
        'Helix called with first=20 then after=cursor',
        topCalls.length === 3 &&
          topCalls[0].includes('first=20') &&
          !topCalls[0].includes('after') &&
          topCalls[1].includes('after=cursor1') &&
          topCalls[2].includes('after=cursor2'),
        JSON.stringify(topCalls),
      );
    },
  );

  // ---------------------------------------------------------------- scenario 3
  console.log('\n[3] Popular long list, compact density');
  await withPopup(
    {
      followed: 3,
      topPages: [
        { count: 20, next: true },
        { count: 20, next: false },
      ],
    },
    'compact',
    async (p) => {
      await waitUntil(p, (s) => s.cards === 3, 'followed loaded');
      await p.eval(clickByText('/^(Popular|Populaire)$/'));
      const s = await waitUntil(p, (x) => x.cards === 20, 'compact popular page 1');
      check('Compact: 20 rows rendered', s.cards === 20);
      check('Compact: cap still 480px', s.list.maxHeight === '480px', s.list.maxHeight);
      check(
        'Compact: rows are list rows, not cards',
        s.list.firstCardHeight < 80,
        `first row ${s.list.firstCardHeight}px tall`,
      );
      check(
        'Compact: page does not scroll',
        !s.pageScrolls,
        `innerHeight=${s.innerHeight} pageScrollHeight=${s.pageScrollHeight}`,
      );
      check(
        'Compact: list scrolls internally',
        s.list.scrolls,
        `client=${s.list.clientHeight} scroll=${s.list.scrollHeight}`,
      );
      check(
        'Compact: "Load more" present',
        s.buttonLabels.some((l) => /Load more|Charger plus/.test(l)),
      );
    },
  );

  // ---------------------------------------------------------------- scenario 4
  console.log('\n[4] Popular empty + error states');
  await withPopup(
    { followed: 3, topPages: [{ count: 0, next: false }] },
    'comfortable',
    async (p) => {
      await waitUntil(p, (s) => s.cards === 3, 'followed loaded');
      await p.eval(clickByText('/^(Popular|Populaire)$/'));
      const s = await waitUntil(
        p,
        (x) => x.cards === 0 && /live right now|en direct pour le moment/.test(x.announce),
        'popular empty state',
      );
      check(
        'Empty state message shown',
        /live right now|en direct pour le moment/.test(s.announce),
        JSON.stringify(s.announce),
      );
      check('Empty state: page does not scroll', !s.pageScrolls);
    },
  );

  await sw.eval(String.raw`
    (() => {
      const real = self.fetch;
      self.fetch = async (input) => {
        const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (new URL(raw).pathname.endsWith('/helix/streams')) return new Response('boom', { status: 500 });
        return real(input);
      };
      return 1;
    })()
  `);
  await withPopup(
    { followed: 3, topPages: [{ count: 5, next: false }] },
    'comfortable',
    async (p) => {
      await waitUntil(p, (s) => s.cards === 3, 'followed loaded');
      await p.eval(clickByText('/^(Popular|Populaire)$/'));
      const s = await waitUntil(
        p,
        (x) =>
          /Couldn't load popular|Impossible de charger les streams populaires/.test(x.announce),
        'popular error state',
      );
      check(
        'Error state message shown',
        /Couldn't load popular|Impossible de charger les streams populaires/.test(s.announce),
      );
      check(
        'Error state offers Retry',
        s.buttonLabels.some((l) => /Retry|Réessayer/.test(l)),
        JSON.stringify(s.buttonLabels),
      );
      check('Error state: page does not scroll', !s.pageScrolls);
    },
  );

  check(
    'No console errors in the popup',
    allConsoleErrors.length === 0,
    allConsoleErrors.slice(0, 3).join(' | '),
  );

  console.log('\n----------------------------------------');
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
  rmSync(profile, { recursive: true, force: true });
}
