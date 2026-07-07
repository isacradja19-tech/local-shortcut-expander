import type { BackupFile, ShortcutDraft } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function cleanShortcut(value: unknown): ShortcutDraft | null {
  if (!isRecord(value)) {
    return null;
  }

  const trigger = typeof value.trigger === 'string' ? value.trigger.trim() : '';
  const content = typeof value.content === 'string' ? value.content : '';
  const label = typeof value.label === 'string' ? value.label.trim() : undefined;

  if (!trigger.startsWith('/') || trigger.length < 2 || content.length === 0) {
    return null;
  }

  return { trigger, content, label };
}

export function parseBackupJson(rawJson: string): ShortcutDraft[] {
  const parsed = JSON.parse(rawJson) as unknown;

  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.shortcuts)) {
    throw new Error('Choose a version 1 shortcut backup file.');
  }

  const shortcuts = parsed.shortcuts
    .map(cleanShortcut)
    .filter((shortcut): shortcut is ShortcutDraft => shortcut !== null);

  if (shortcuts.length === 0) {
    throw new Error('No valid shortcuts were found in that backup.');
  }

  return shortcuts;
}

export function createBackupJson(shortcuts: ShortcutDraft[]): string {
  const backup: BackupFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    shortcuts,
  };

  return JSON.stringify(backup, null, 2);
}
