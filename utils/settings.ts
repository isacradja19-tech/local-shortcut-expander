import type { Settings } from './types';

const SETTINGS_KEY = 'shortcut-expander-settings';
const DEFAULT_SETTINGS: Settings = { enabled: true };

export async function getSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...(stored[SETTINGS_KEY] as Partial<Settings> | undefined),
  };
}

export async function saveSettings(settings: Settings) {
  await browser.storage.local.set({ [SETTINGS_KEY]: settings });
}
