import { listShortcuts } from '@/utils/db';
import { getSettings } from '@/utils/settings';
import type { ExtensionRequest } from '@/utils/messages';

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    console.info('Local Shortcut Expander installed.');
  });

  browser.runtime.onMessage.addListener(async (message: ExtensionRequest) => {
    if (message.type === 'shortcuts:list') {
      return { shortcuts: await listShortcuts() };
    }

    if (message.type === 'settings:get') {
      return { settings: await getSettings() };
    }

    return {};
  });
});
