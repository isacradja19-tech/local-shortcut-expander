import type { Settings, Shortcut } from './types';

export type ExtensionRequest = {
  type: 'shortcuts:list';
} | {
  type: 'settings:get';
};

export type ExtensionResponse = {
  shortcuts?: Shortcut[];
  settings?: Settings;
};
