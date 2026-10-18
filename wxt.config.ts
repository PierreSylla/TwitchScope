import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
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
        id: 'twitchscope@psylla.fr',
        strict_min_version: '121.0',
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  },
});
