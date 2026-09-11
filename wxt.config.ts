import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  // No MV2 fallback on Firefox (WXT's default). Firefox 121+ runs the MV3
  // background as an event page (background.scripts), not a service worker.
  manifestVersion: 3,
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['storage', 'alarms', 'notifications', 'identity'],
    host_permissions: ['https://api.twitch.tv/*', 'https://id.twitch.tv/*'],
    browser_specific_settings: {
      gecko: {
        // TODO: replace with the real ID once the extension is registered on AMO.
        id: 'twitchscope@example.invalid',
        strict_min_version: '121.0',
      },
    },
  },
});
