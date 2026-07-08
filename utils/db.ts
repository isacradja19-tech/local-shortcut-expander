import Dexie, { type Table } from 'dexie';
import type { Shortcut, ShortcutDraft } from './types';

class ShortcutDatabase extends Dexie {
  shortcuts!: Table<Shortcut, number>;

  constructor() {
    super('local-shortcut-expander');
    this.version(1).stores({
      shortcuts: '++id,&trigger,updatedAt,createdAt',
    });
  }
}

export const db = new ShortcutDatabase();

export async function listShortcuts() {
  return db.shortcuts.orderBy('trigger').toArray();
}

export async function getShortcutByTrigger(trigger: string) {
  return db.shortcuts.where('trigger').equals(trigger).first();
}

export async function saveShortcut(draft: ShortcutDraft, id?: number) {
  const now = Date.now();
  const trigger = draft.trigger.trim();

  if (!trigger.startsWith('/') || trigger.length < 2) {
    throw new Error('Triggers must start with / and include at least one letter.');
  }

  if (draft.content.trim().length === 0) {
    throw new Error('Shortcut text cannot be empty.');
  }

  if (id) {
    const existing = await db.shortcuts.get(id);

    await db.shortcuts.put({
      id,
      trigger,
      content: draft.content,
      label: draft.label?.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    return;
  }

  await db.shortcuts.add({
    trigger,
    content: draft.content,
    label: draft.label?.trim(),
    createdAt: now,
    updatedAt: now,
  });
}

export async function deleteShortcut(id: number) {
  await db.shortcuts.delete(id);
}

export async function importShortcuts(shortcuts: ShortcutDraft[]) {
  const now = Date.now();

  await db.transaction('rw', db.shortcuts, async () => {
    for (const shortcut of shortcuts) {
      const existing = await db.shortcuts.where('trigger').equals(shortcut.trigger).first();

      await db.shortcuts.put({
        id: existing?.id,
        trigger: shortcut.trigger,
        content: shortcut.content,
        label: shortcut.label,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
    }
  });
}
