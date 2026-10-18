# TwitchScope

A cross-browser extension that shows which of your followed Twitch channels are
live, plus top streams, categories and search. Built with WXT, React and
TypeScript.

## Build instructions for add-on reviewers

These instructions rebuild the exact artifact submitted to addons.mozilla.org.

### Environment

The submitted build was produced on:

| Tool    | Version used               |
| ------- | -------------------------- |
| OS      | CachyOS (Arch-based Linux) |
| Node.js | 26.11.1                    |
| npm     | 12.2.1                     |

This differs from the default reviewer environment (Ubuntu 24.04, Node 24.14.0,
npm 11.9.0), so it is declared here as required. The build is a standard
Vite/WXT production build with no platform-specific steps; Node 20 or later
should reproduce it. Install Node from <https://nodejs.org/>.

### The Twitch client ID is required to reproduce the build

The extension talks to the Twitch Helix API, and the Twitch application's
`client_id` is inlined into the bundle **at build time** from an environment
variable. Building without it produces different output, because the value is
embedded in the JavaScript.

This identifier is **public, not a secret**. Twitch issues it to identify the
application in OAuth requests; the extension is a public client and ships no
`client_secret` of any kind. The same value is readable in the submitted
package.

Create a `.env` file in the project root before building:

```sh
echo 'WXT_TWITCH_CLIENT_ID=3xbogds6hzlvrbgxflsa9n82hiv2ic' > .env
```

### Build

```sh
npm ci                  # install exactly the versions in package-lock.json
npm run build:firefox   # outputs .output/firefox-mv3/
npm run zip:firefox     # outputs .output/twitchscope-1.0.0-firefox.zip
```

`.output/firefox-mv3/` is the unpacked extension and should match the contents
of the submitted package file for file. The build is deterministic: repeated
clean builds (including deleting `.output/` and `.wxt/`) produce byte-identical
output.

### Notes on the validator warnings

- **Two `innerHTML` warnings in `chunks/popup-*.js`.** These come from the
  React DOM runtime (React ^19.2.4) bundled into the extension, specifically its
  `dangerouslySetInnerHTML` property handler. The extension's own source never
  uses `innerHTML` or `dangerouslySetInnerHTML`; searching the source tree
  returns no matches. React only reaches that code path when an application
  passes `dangerouslySetInnerHTML`, which this extension does not.
- **Two `strict_min_version` warnings.** `data_collection_permissions` was
  introduced in Firefox 140 (142 on Android), while this extension supports
  Firefox 121 and later. Older versions ignore the unknown key. The extension
  declares `required: ["none"]`, so there is no data-consent prompt those users
  could miss. The lower bound is kept deliberately so that ESR 128 remains
  supported.

### What the extension does with data

Nothing is sent anywhere except the Twitch API the user signs in to
(`api.twitch.tv` and `id.twitch.tv`). There is no backend belonging to the
developer, no analytics and no telemetry. The OAuth token is held in
`storage.session` and never logged; preferences are held in `storage.sync`,
which is the user's own browser account. This is why the manifest declares
`data_collection_permissions: { required: ["none"] }`.

## Development

```sh
npm install
npm run dev             # Chrome, with HMR
npm run dev:firefox     # Firefox
npm run lint            # ESLint
npm run compile         # tsc --noEmit
npm run test            # Vitest unit tests
```

`scripts/*-e2e.mjs` drive the built extension in a real headless browser over
the DevTools protocol; they are development tooling and are not part of the
shipped package.
