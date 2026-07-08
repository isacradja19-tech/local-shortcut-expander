import { getShortcutByTrigger } from '@/utils/db';
import { addRuntimeMessageListener } from '@/utils/chromeRuntime';
import { getSettings } from '@/utils/settings';
import type { ExtensionRequest, ExtensionResponse } from '@/utils/messages';

const DEV_LOGS = true;

function log(...message: unknown[]) {
  if (DEV_LOGS) {
    console.info('[Local Shortcut Expander background]', ...message);
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    log('installed');
  });

  addRuntimeMessageListener(handleMessage);
});

async function handleMessage(message: ExtensionRequest): Promise<ExtensionResponse> {
  if (message.type === 'GET_SNIPPET_BY_TRIGGER') {
    log('snippet lookup requested', message.trigger);
    const shortcut = await getShortcutByTrigger(message.trigger);
    const body = shortcut && shortcut.enabled !== false ? shortcut.content : null;
    log(body ? 'snippet found' : 'snippet not found', message.trigger);
    return { body };
  }

  if (message.type === 'GET_SETTINGS') {
    return { settings: await getSettings() };
  }

  return { body: null };
}
