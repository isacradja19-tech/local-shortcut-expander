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

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  main() {
    document.addEventListener('keydown', handleKeydown, true);
    document.addEventListener('input', handleInput, true);
  },
});

async function handleKeydown(event: KeyboardEvent) {
  try {
    if (!isExpansionKey(event.key) || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const textField = findTextField(event);

    if (textField) {
      await expandTextFieldBeforeDelimiter(event, textField);
      return;
    }

    const editable = findEditableField(event);

    if (editable) {
      await expandEditableBeforeDelimiter(event, editable);
    }
  } catch {
    // Avoid breaking the host page if a site blocks extension messaging or selection APIs.
  }
}

async function handleInput(event: Event) {
  try {
    const textField = findTextField(event);

    if (textField) {
      await expandTextFieldAfterDelimiter(textField);
      return;
    }

    const editable = findEditableField(event);

    if (editable) {
      await expandEditableAfterDelimiter(editable);
    }
  } catch {
    // Input fallback is best-effort; the page should continue normally on failure.
  }
}

function findTextField(event: Event) {
  for (const target of event.composedPath()) {
    if (target instanceof HTMLTextAreaElement) {
      return target;
    }

    if (target instanceof HTMLInputElement && isTextInput(target)) {
      return target;
    }
  }

  const activeElement = deepestActiveElement();

  if (activeElement instanceof HTMLTextAreaElement) {
    return activeElement;
  }

  if (activeElement instanceof HTMLInputElement && isTextInput(activeElement)) {
    return activeElement;
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

async function expandTextFieldBeforeDelimiter(
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

  event.preventDefault();

  const body = await getEnabledSnippetBody(trigger);

  if (body === null) {
    insertTextFieldDelimiter(field, event.key);
    return;
  }

  replaceTextFieldRange(field, caret - trigger.length, caret, body);
}

async function expandTextFieldAfterDelimiter(
  field: HTMLInputElement | HTMLTextAreaElement,
) {
  const caret = field.selectionStart;

  if (caret === null || field.selectionEnd !== caret) {
    return;
  }

  const match = findDelimitedTriggerBeforeCaret(field.value.slice(0, caret));

  if (!match) {
    return;
  }

  const body = await getEnabledSnippetBody(match.trigger);

  if (body === null) {
    return;
  }

  const start = caret - match.trigger.length - match.delimiterLength;
  replaceTextFieldRange(field, start, caret, body);
}

async function expandEditableBeforeDelimiter(event: KeyboardEvent, editable: HTMLElement) {
  const selectionState = getEditableSelection(editable);

  if (!selectionState) {
    return;
  }

  const trigger = findTriggerBeforeCaret(selectionState.textBeforeCaret);

  if (!trigger) {
    return;
  }

  event.preventDefault();

  const body = await getEnabledSnippetBody(trigger);

  if (body === null) {
    insertEditableDelimiter(event.key);
    return;
  }

  replaceEditableRange(
    editable,
    selectionState.textBeforeCaret.length - trigger.length,
    selectionState.textBeforeCaret.length,
    body,
  );
}

async function expandEditableAfterDelimiter(editable: HTMLElement) {
  const selectionState = getEditableSelection(editable);

  if (!selectionState) {
    return;
  }

  const match = findDelimitedTriggerBeforeCaret(selectionState.textBeforeCaret);

  if (!match) {
    return;
  }

  const body = await getEnabledSnippetBody(match.trigger);

  if (body === null) {
    return;
  }

  const end = selectionState.textBeforeCaret.length;
  const start = end - match.trigger.length - match.delimiterLength;
  replaceEditableRange(editable, start, end, body);
}

function getEditableSelection(editable: HTMLElement) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (!editable.contains(range.startContainer)) {
    return null;
  }

  const beforeCaret = range.cloneRange();
  beforeCaret.selectNodeContents(editable);
  beforeCaret.setEnd(range.startContainer, range.startOffset);

  return {
    selection,
    textBeforeCaret: beforeCaret.toString(),
  };
}

function replaceTextFieldRange(
  field: HTMLInputElement | HTMLTextAreaElement,
  start: number,
  end: number,
  text: string,
) {
  field.setRangeText(text, start, end, 'end');
  field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
}

function replaceEditableRange(
  editable: HTMLElement,
  startOffset: number,
  endOffset: number,
  text: string,
) {
  const selection = window.getSelection();
  const start = findTextPosition(editable, startOffset);
  const end = findTextPosition(editable, endOffset);

  if (!selection || !start || !end) {
    return;
  }

  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  editable.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
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

function insertTextFieldDelimiter(
  field: HTMLInputElement | HTMLTextAreaElement,
  key: string,
) {
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? field.value.length;
  replaceTextFieldRange(field, start, end, delimiterText(key));
}

function insertEditableDelimiter(key: string) {
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

async function getEnabledSnippetBody(trigger: string) {
  const settings = await getSettingsFromExtension();

  if (!settings.enabled) {
    return null;
  }

  const response = await sendRuntimeMessage({
    type: 'GET_SNIPPET_BY_TRIGGER',
    trigger,
  }) as GetSnippetByTriggerResponse;

  return response.body;
}

async function getSettingsFromExtension(): Promise<Settings> {
  const response = await sendRuntimeMessage({ type: 'GET_SETTINGS' }) as GetSettingsResponse;
  return response.settings;
}
