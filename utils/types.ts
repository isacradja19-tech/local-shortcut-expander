export type Shortcut = {
  id?: number;
  trigger: string;
  content: string;
  label?: string;
  createdAt: number;
  updatedAt: number;
};

export type Settings = {
  enabled: boolean;
};

export type ShortcutDraft = {
  trigger: string;
  content: string;
  label?: string;
};

export type BackupFile = {
  version: 1;
  exportedAt: string;
  shortcuts: ShortcutDraft[];
};
