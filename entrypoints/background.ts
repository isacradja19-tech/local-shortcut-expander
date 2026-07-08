import { getShortcutByTrigger } from '@/utils/db';
import { addRuntimeMessageListener } from '@/utils/chromeRuntime';
import { getSettings } from '@/utils/settings';
import type { ExtensionRequest, ExtensionResponse } from '@/utils/messages';

export default defineBackground(() => {
  addRuntimeMessageListener(handleMessage);
});

async function handleMessage(message: ExtensionRequest): Promise<ExtensionResponse> {
  if (message.type === 'GET_SNIPPET_BY_TRIGGER') {
    const shortcut = await getShortcutByTrigger(message.trigger);
    const body = shortcut && shortcut.enabled !== false ? shortcut.content : null;
    return { body };
  }

  if (message.type === 'GET_SETTINGS') {
    return { settings: await getSettings() };
  }

  return { body: null };
}
