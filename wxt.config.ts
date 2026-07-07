import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Local Shortcut Expander',
    description: 'Expand locally stored text shortcuts in browser fields.',
    permissions: ['storage'],
    action: {
      default_title: 'Local Shortcut Expander',
    },
  },
});
