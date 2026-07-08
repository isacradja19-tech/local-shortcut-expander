import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Easeit',
    short_name: 'Easeit',
    description: 'Create local text shortcuts that expand while you type. No account, no sync, no tracking.',
    icons: {
      16: 'icon/icon-16.png',
      32: 'icon/icon-32.png',
      48: 'icon/icon-48.png',
      96: 'icon/icon-96.png',
      128: 'icon/icon-128.png',
    },
    permissions: ['storage'],
    action: {
      default_title: 'Easeit',
      default_icon: {
        16: 'icon/icon-16.png',
        32: 'icon/icon-32.png',
        48: 'icon/icon-48.png',
        96: 'icon/icon-96.png',
        128: 'icon/icon-128.png',
      },
    },
  },
});
