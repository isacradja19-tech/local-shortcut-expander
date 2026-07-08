export type Shortcut = {
  id?: number;
  trigger: string;
  content: string;
  label?: string;
  /** Absent ou `true` = actif. Seul `false` désactive. */
  enabled?: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Settings = {
  enabled: boolean;
};

/** Ce que le content script met en cache : un seul aller-retour au chargement. */
export type ExtensionState = {
  settings: Settings;
  shortcuts: Shortcut[];
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