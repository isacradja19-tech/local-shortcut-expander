import {
  findDelimitedTriggerBeforeCaret,
  findTriggerBeforeCaret,
  isExpansionKey,
} from '@/utils/expansion';
import { sendRuntimeMessage } from '@/utils/chromeRuntime';
import type {
  GetSettingsResponse,
  GetSnippetByTriggerResponse,
} from '@/utils/messages';
import type { Settings } from '@/utils/types';

const DEV_LOGS = true;
const typedBuffer = {
  value: '',
  lastTarget: null as EventTarget | null,
};

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  main() {
    log('content script loaded', window.location.href);
    maybeAddTestField();
    document.addEventListener('keydown', handleKeydown, true);
    document.addEventListener('input', handleInput, true);
    document.addEventListener('selectionchange', trimTypedBuffer);
  },
});

function log(...message: unknown[]) {
  if (DEV_LOGS) {
    console.info('[Local Shortcut Expander content]', ...message);
  }
}

function maybeAddTestField() {
  const params = new URLSearchParams(window.location.search);

  if (window.location.hostname !== 'example.com' || !params.has('shortcut-expander-test')) {
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.autofocus = true;
  textarea.placeholder = 'Type /sig then press space';
  textarea.style.cssText = [
    'display:block',
    'width:min(560px, calc(100% - 32px))',
    'height:160px',
    'margin:32px auto',
    'padding:14px',
    'font:18px system-ui, sans-serif',
    'border:2px solid #2057a7',
    'border-radius:8px',
  ].join(';');

  document.body.prepend(textarea);
  textarea.focus();
  log('test field added');
}

async function handleKeydown(event: KeyboardEvent) {
  try {
    updateTypedBuffer(event);

    if (!isExpansionKey(event.key) || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    log('keydown detected', event.key);

    const field = findPlainTextField(event);

    if (field) {
      await expandPlainTextField(event, field);
      return;
    }

    const editable = findContentEditable(event);

    if (editable) {
      await expandContentEditable(event, editable);
      return;
    }

    await expandUnknownEditor(event);
  } catch (error) {
    log('expansion flow failed', error);
  }
}

async function handleInput(event: Event) {
  try {
    const field = findPlainTextField(event);

    if (field) {
      await expandPlainTextFieldAfterInput(field);
      return;
    }

    const editable = findContentEditable(event);

    if (editable) {
      await expandContentEditableAfterInput(editable);
    }
  } catch (error) {
    log('input fallback failed', error);
  }
}

function updateTypedBuffer(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  if (typedBuffer.lastTarget !== event.target) {
    typedBuffer.value = '';
    typedBuffer.lastTarget = event.target;
  }

  if (event.key === 'Backspace') {
    typedBuffer.value = typedBuffer.value.slice(0, -1);
    return;
  }

  if (event.key === 'Escape' || event.key.startsWith('Arrow')) {
    typedBuffer.value = '';
    return;
  }

  if (isExpansionKey(event.key)) {
    return;
  }

  if (event.key.length === 1) {
    typedBuffer.value = `${typedBuffer.value}${event.key}`.slice(-80);
  }
}

function trimTypedBuffer() {
  typedBuffer.value = typedBuffer.value.slice(-80);
}

function findPlainTextField(event: Event) {
  const targets = event.composedPath();

  for (const target of targets) {
    if (target instanceof HTMLTextAreaElement) {
      return target;
    }

    if (target instanceof HTMLInputElement && isTextInput(target)) {
      return target;
    }
  }

  const active = deepestActiveElement();

  if (active instanceof HTMLTextAreaElement) {
    return active;
  }

  if (active instanceof HTMLInputElement && isTextInput(active)) {
    return active;
  }

  return null;
}

function isTextInput(input: HTMLInputElement) {
  return [
    '',
    'email',
    'number',
    'password',
    'search',
    'tel',
    'text',
    'url',
  ].includes(input.type);
}

function findContentEditable(event: Event) {
  for (const target of event.composedPath()) {
    if (!(target instanceof Element)) {
      continue;
    }

    const editable = target.closest('[contenteditable]');

    if (editable instanceof HTMLElement && editable.isContentEditable) {
      return editable;
    }
  }

  const active = deepestActiveElement();

  if (active instanceof HTMLElement && active.isContentEditable) {
    return active;
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
  let active = document.activeElement;

  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }

  return active;
}

async function expandPlainTextField(
  event: KeyboardEvent,
  field: HTMLInputElement | HTMLTextAreaElement,
) {
  const caret = field.selectionStart;

  if (caret === null || field.selectionEnd !== caret) {
    return;
  }

  const textBeforeCaret = field.value.slice(0, caret);
  const trigger = findTriggerBeforeCaret(textBeforeCaret);

  if (!trigger) {
    return;
  }

  log('trigger detected', trigger);
  event.preventDefault();

  const settings = await getSettingsFromExtension();

  if (!settings.enabled) {
    log('extension disabled');
    insertPlainTextDelimiter(field, event.key);
    return;
  }

  const body = await getSnippetBodyByTrigger(trigger);

  if (body === null) {
    insertPlainTextDelimiter(field, event.key);
    return;
  }

  log('replacement attempted', trigger);
  field.setRangeText(body, caret - trigger.length, caret, 'end');
  field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
}

async function expandPlainTextFieldAfterInput(
  field: HTMLInputElement | HTMLTextAreaElement,
) {
  const caret = field.selectionStart;

  if (caret === null || field.selectionEnd !== caret) {
    return;
  }

  const textBeforeCaret = field.value.slice(0, caret);
  const match = findDelimitedTriggerBeforeCaret(textBeforeCaret);

  if (!match) {
    return;
  }

  log('trigger detected', match.trigger);

  const settings = await getSettingsFromExtension();

  if (!settings.enabled) {
    log('extension disabled');
    return;
  }

  const body = await getSnippetBodyByTrigger(match.trigger);

  if (body === null) {
    return;
  }

  log('replacement attempted', match.trigger);
  const end = caret;
  const start = caret - match.trigger.length - match.delimiterLength;
  field.setRangeText(body, start, end, 'end');
  field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
}

async function expandContentEditable(event: KeyboardEvent, editable: HTMLElement) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return;
  }

  const range = selection.getRangeAt(0);

  if (!editable.contains(range.startContainer)) {
    return;
  }

  const beforeRange = range.cloneRange();
  beforeRange.selectNodeContents(editable);
  beforeRange.setEnd(range.startContainer, range.startOffset);

  const textBeforeCaret = beforeRange.toString();
  const trigger = findTriggerBeforeCaret(textBeforeCaret);

  if (!trigger) {
    return;
  }

  log('trigger detected', trigger);
  event.preventDefault();

  const settings = await getSettingsFromExtension();

  if (!settings.enabled) {
    log('extension disabled');
    insertContentEditableDelimiter(event.key);
    return;
  }

  const body = await getSnippetBodyByTrigger(trigger);

  if (body === null) {
    insertContentEditableDelimiter(event.key);
    return;
  }

  const start = findTextPosition(editable, textBeforeCaret.length - trigger.length);
  const end = findTextPosition(editable, textBeforeCaret.length);

  if (!start || !end) {
    return;
  }

  log('replacement attempted', trigger);
  const replaceRange = document.createRange();
  replaceRange.setStart(start.node, start.offset);
  replaceRange.setEnd(end.node, end.offset);
  replaceRange.deleteContents();
  replaceRange.insertNode(document.createTextNode(body));
  replaceRange.collapse(false);
  selection.removeAllRanges();
  selection.addRange(replaceRange);
  editable.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
}

async function expandContentEditableAfterInput(editable: HTMLElement) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return;
  }

  const range = selection.getRangeAt(0);

  if (!editable.contains(range.startContainer)) {
    return;
  }

  const beforeRange = range.cloneRange();
  beforeRange.selectNodeContents(editable);
  beforeRange.setEnd(range.startContainer, range.startOffset);

  const textBeforeCaret = beforeRange.toString();
  const match = findDelimitedTriggerBeforeCaret(textBeforeCaret);

  if (!match) {
    return;
  }

  log('trigger detected', match.trigger);

  const settings = await getSettingsFromExtension();

  if (!settings.enabled) {
    log('extension disabled');
    return;
  }

  const body = await getSnippetBodyByTrigger(match.trigger);

  if (body === null) {
    return;
  }

  const endOffset = textBeforeCaret.length;
  const startOffset = endOffset - match.trigger.length - match.delimiterLength;
  const start = findTextPosition(editable, startOffset);
  const end = findTextPosition(editable, endOffset);

  if (!start || !end) {
    return;
  }

  log('replacement attempted', match.trigger);
  const replaceRange = document.createRange();
  replaceRange.setStart(start.node, start.offset);
  replaceRange.setEnd(end.node, end.offset);
  replaceRange.deleteContents();
  replaceRange.insertNode(document.createTextNode(body));
  replaceRange.collapse(false);
  selection.removeAllRanges();
  selection.addRange(replaceRange);
  editable.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
}

async function expandUnknownEditor(event: KeyboardEvent) {
  const trigger = findTriggerBeforeCaret(typedBuffer.value);

  if (!trigger) {
    return;
  }

  log('trigger detected in custom editor', trigger);
  event.preventDefault();

  const settings = await getSettingsFromExtension();

  if (!settings.enabled) {
    log('extension disabled');
    await insertIntoCustomEditor(delimiterText(event.key));
    return;
  }

  const body = await getSnippetBodyByTrigger(trigger);

  if (body === null) {
    await insertIntoCustomEditor(delimiterText(event.key));
    return;
  }

  log('replacement attempted in custom editor', trigger);
  await removeRecentlyTypedTrigger(trigger.length);
  await insertIntoCustomEditor(body);
  typedBuffer.value = '';
}

async function removeRecentlyTypedTrigger(characterCount: number) {
  for (let index = 0; index < characterCount; index += 1) {
    document.execCommand('delete');
    await waitForEditorTick();
  }
}

async function insertIntoCustomEditor(text: string) {
  if (document.execCommand('insertText', false, text)) {
    return;
  }

  const active = deepestActiveElement();

  if (active instanceof HTMLElement) {
    const data = new DataTransfer();
    data.setData('text/plain', text);
    active.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: data,
    }));
  }
}

function waitForEditorTick() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function findTextPosition(root: HTMLElement, characterOffset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remainingOffset = characterOffset;
  let lastTextNode: Text | null = null;

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    lastTextNode = node;

    if (remainingOffset <= node.data.length) {
      return { node, offset: remainingOffset };
    }

    remainingOffset -= node.data.length;
  }

  if (lastTextNode) {
    return { node: lastTextNode, offset: lastTextNode.data.length };
  }

  const textNode = document.createTextNode('');
  root.append(textNode);
  return { node: textNode, offset: 0 };
}

function delimiterText(key: string) {
  if (key === 'Enter') {
    return '\n';
  }

  if (key === 'Tab') {
    return '\t';
  }

  return ' ';
}

function insertPlainTextDelimiter(
  field: HTMLInputElement | HTMLTextAreaElement,
  key: string,
) {
  const delimiter = delimiterText(key);
  field.setRangeText(delimiter, field.selectionStart ?? field.value.length, field.selectionEnd ?? field.value.length, 'end');
  field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
}

function insertContentEditableDelimiter(key: string) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(delimiterText(key)));
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

async function getSnippetBodyByTrigger(trigger: string) {
  log('snippet lookup requested', trigger);
  const response = await sendRuntimeMessage({
    type: 'GET_SNIPPET_BY_TRIGGER',
    trigger,
  }) as GetSnippetByTriggerResponse;
  log(response.body === null ? 'snippet not found' : 'snippet found', trigger);
  return response.body;
}

async function getSettingsFromExtension(): Promise<Settings> {
  const response = await sendRuntimeMessage({ type: 'GET_SETTINGS' }) as GetSettingsResponse;
  return response.settings;
}
