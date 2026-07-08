import type { Settings, Shortcut } from './types';

export type GetStateRequest = {
  type: 'GET_STATE';
};

export type GetSettingsRequest = {
  type: 'GET_SETTINGS';
};

export type GetSnippetByTriggerRequest = {
  type: 'GET_SNIPPET_BY_TRIGGER';
  trigger: string;
};

/** Popup/options → background, après une écriture en base. */
export type NotifyStateChangedRequest = {
  type: 'NOTIFY_STATE_CHANGED';
};

/** Background → tous les content scripts, pour invalider leur cache. */
export type StateChangedRequest = {
  type: 'STATE_CHANGED';
};

export type ExtensionRequest =
  | GetStateRequest
  | GetSettingsRequest
  | GetSnippetByTriggerRequest
  | NotifyStateChangedRequest
  | StateChangedRequest;

export type ExtensionRequestType = ExtensionRequest['type'];

// ---------------------------------------------------------------------------
// Réponses
// ---------------------------------------------------------------------------

export type GetStateResponse = {
  settings: Settings;
  shortcuts: Shortcut[];
};

export type GetSettingsResponse = {
  settings: Settings;
};

export type GetSnippetByTriggerResponse = {
  body: string | null;
};

export type AckResponse = {
  ok: true;
};

export type ExtensionResponseMap = {
  GET_STATE: GetStateResponse;
  GET_SETTINGS: GetSettingsResponse;
  GET_SNIPPET_BY_TRIGGER: GetSnippetByTriggerResponse;
  NOTIFY_STATE_CHANGED: AckResponse;
  STATE_CHANGED: AckResponse;
};

export type ExtensionResponse = ExtensionResponseMap[ExtensionRequestType];

export type ResponseFor<TRequest extends ExtensionRequest> =
  ExtensionResponseMap[TRequest['type']];

const REQUEST_TYPES: ReadonlySet<string> = new Set<ExtensionRequestType>([
  'GET_STATE',
  'GET_SETTINGS',
  'GET_SNIPPET_BY_TRIGGER',
  'NOTIFY_STATE_CHANGED',
  'STATE_CHANGED',
]);

export function isExtensionRequest(value: unknown): value is ExtensionRequest {
  return (
    typeof value === 'object'
    && value !== null
    && 'type' in value
    && typeof (value as { type: unknown }).type === 'string'
    && REQUEST_TYPES.has((value as { type: string }).type)
  );
}