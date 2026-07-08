import { findTriggerBeforeCaret, isExpansionKey } from '@/utils/expansion';
import { addRuntimeMessageListener, sendRuntimeMessage } from '@/utils/chromeRuntime';
import type { GetStateResponse } from '@/utils/messages';
import type { Settings } from '@/utils/types';

const TEXT_INPUT_TYPES = new Set(['', 'email', 'number', 'search', 'tel', 'text', 'url']);

let settings: Settings = { enabled: false };
let snippets = new Map<string, string>();

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  matchAboutBlank: true,
  matchOriginAsFallback: true,
  runAt: 'document_start',
  main() {
    void refreshState();

    addRuntimeMessageListener(async (message) => {
      if (message.type === 'STATE_CHANGED') {
        await refreshState();
      }

      return { body: null };
    });

    document.addEventListener('keydown', handleKeydown, true);
  },
});

async function refreshState() {
  try {
    const state = await sendRuntimeMessage({ type: 'GET_STATE' }) as GetStateResponse;

    settings = state.settings;
    snippets = new Map(
      state.shortcuts
        .filter((shortcut) => shortcut.enabled !== false)
        .map((shortcut) => [shortcut.trigger, shortcut.content]),
    );
  } catch {
    // Le service worker peut être endormi au tout premier chargement.
  }
}

// Entièrement synchrone : on ne touche à l'événement que si un snippet existe.
function handleKeydown(event: KeyboardEvent) {
  if (!settings.enabled) {
    return;
  }

  if (event.isComposing || event.keyCode === 229) {
    return;
  }

  if (!isExpansionKey(event.key) || event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  try {
    const field = findTextField(event);

    if (field) {
      tryExpandTextField(event, field);
      return;
    }

    const editable = findEditableField(event);

    if (editable) {
      tryExpandEditable(event, editable);
    }
  } catch {
    // Ne jamais casser la page hôte.
  }
}

function tryExpandTextField(
  event: KeyboardEvent,
  field: HTMLInputElement | HTMLTextAreaElement,
) {
  const caret = field.selectionStart;

  if (caret === null || field.selectionEnd !== caret) {
    return;
  }

  const trigger = findTriggerBeforeCaret(field.value.slice(0, caret));

  if (!trigger) {
    return;
  }

  const body = snippets.get(trigger);

  if (body === undefined) {
    return; // Tab / Enter / Espace gardent leur comportement natif.
  }

  event.preventDefault();
  event.stopImmediatePropagation();

  field.focus();
  field.setSelectionRange(caret - trigger.length, caret);

  if (!document.execCommand('insertText', false, body)) {
    field.setRangeText(body, caret - trigger.length, caret, 'end');
    field.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText', data: body }),
    );
  }
}

function tryExpandEditable(event: KeyboardEvent, editable: HTMLElement) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return;
  }

  const { startContainer, startOffset } = selection.getRangeAt(0);

  if (!editable.contains(startContainer) || startContainer.nodeType !== Node.TEXT_NODE) {
    return;
  }

  const node = startContainer as Text;
  const trigger = findTriggerBeforeCaret(node.data.slice(0, startOffset));

  if (!trigger || startOffset - trigger.length < 0) {
    return;
  }

  const body = snippets.get(trigger);

  if (body === undefined) {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();

  const range = document.createRange();
  range.setStart(node, startOffset - trigger.length);
  range.setEnd(node, startOffset);
  selection.removeAllRanges();
  selection.addRange(range);

  // execCommand émet un vrai beforeinput/input : ProseMirror, Slate, Lexical,
  // Quill et Draft.js l'acceptent, contrairement à une mutation DOM directe.
  if (!document.execCommand('insertText', false, body)) {
    range.deleteContents();

    const inserted = document.createTextNode(body);
    range.insertNode(inserted);
    range.setStartAfter(inserted);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editable.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText', data: body }),
    );
  }
}

function findTextField(event: Event) {
  for (const target of event.composedPath()) {
    if (target instanceof HTMLTextAreaElement && isWritable(target)) {
      return target;
    }

    if (target instanceof HTMLInputElement && isTextInput(target)) {
      return target;
    }
  }

  const activeElement = deepestActiveElement();

  if (activeElement instanceof HTMLTextAreaElement && isWritable(activeElement)) {
    return activeElement;
  }

  if (activeElement instanceof HTMLInputElement && isTextInput(activeElement)) {
    return activeElement;
  }

  return null;
}

function isWritable(field: HTMLInputElement | HTMLTextAreaElement) {
  return !field.readOnly && !field.disabled;
}

function isTextInput(input: HTMLInputElement) {
  // type=password et les champs OTP sont volontairement exclus.
  return (
    TEXT_INPUT_TYPES.has(input.type)
    && isWritable(input)
    && input.autocomplete !== 'one-time-code'
  );
}

function findEditableField(event: Event) {
  for (const target of event.composedPath()) {
    if (!(target instanceof Element)) {
      continue;
    }

    const editable = target.closest('[contenteditable]');

    if (editable instanceof HTMLElement && editable.isContentEditable) {
      return editable;
    }
  }

  const activeElement = deepestActiveElement();

  if (activeElement instanceof HTMLElement && activeElement.isContentEditable) {
    return activeElement;
  }

  // Éditeurs riches basés sur une iframe en designMode (TinyMCE, anciens CKEditor).
  if (document.designMode === 'on' && document.body) {
    return document.body;
  }

  const selection = window.getSelection();
  const selectionElement = selection?.anchorNode instanceof Element
    ? selection.anchorNode
    : selection?.anchorNode?.parentElement;
  const editable = selectionElement?.closest('[contenteditable]');

  if (editable instanceof HTMLElement && editable.isContentEditable) {
    return editable;
  }

  return null;
}

function deepestActiveElement() {
  let activeElement = document.activeElement;

  while (activeElement?.shadowRoot?.activeElement) {
    activeElement = activeElement.shadowRoot.activeElement;
  }

  return activeElement;
}