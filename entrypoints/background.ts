import { addRuntimeMessageListener, broadcastToTabs } from '@/utils/chromeRuntime';
import type { ExtensionResponse } from '@/utils/messages';
import type { Settings, Shortcut } from '@/utils/types';

// import { getSettings, getShortcuts } from '@/utils/db';

const DEFAULT_SETTINGS: Settings = { enabled: true };

async function loadSettings(): Promise<Settings> {
  // return await getSettings();
  return DEFAULT_SETTINGS;
}

async function loadShortcuts(): Promise<Shortcut[]> {
  // return await getShortcuts();
  return [];
}

export default defineBackground(() => {
  addRuntimeMessageListener(async (message): Promise<ExtensionResponse> => {
    switch (message.type) {
      case 'GET_STATE':
        return {
          settings: await loadSettings(),
          shortcuts: await loadShortcuts(),
        };

      case 'GET_SETTINGS':
        return { settings: await loadSettings() };

      // Conservé pour compatibilité : le content script ne l'utilise plus.
      case 'GET_SNIPPET_BY_TRIGGER': {
        const shortcuts = await loadShortcuts();
        const match = shortcuts.find(
          (shortcut) => shortcut.enabled !== false && shortcut.trigger === message.trigger,
        );

        return { body: match?.content ?? null };
      }

      case 'NOTIFY_STATE_CHANGED':
        await broadcastToTabs({ type: 'STATE_CHANGED' });
        return { ok: true };

      // Émis par le background, jamais reçu par lui.
      case 'STATE_CHANGED':
        return { ok: true };
    }
  });
});