import type { Settings } from './types';

export type GetSnippetByTriggerRequest = {
  type: 'GET_SNIPPET_BY_TRIGGER';
  trigger: string;
};

export type GetSettingsRequest = {
  type: 'GET_SETTINGS';
};

export type ExtensionRequest = GetSnippetByTriggerRequest | GetSettingsRequest;

export type GetSnippetByTriggerResponse = {
  body: string | null;
};

export type GetSettingsResponse = {
  settings: Settings;
};

export type ExtensionResponse = GetSnippetByTriggerResponse | GetSettingsResponse;
