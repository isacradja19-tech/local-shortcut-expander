export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    document.addEventListener('keydown', handleKeydown, true);
  },
});

import { findExpansion, isExpansionKey } from '@/utils/expansion';
import type { ExtensionRequest, ExtensionResponse } from '@/utils/messages';
import type { Settings, Shortcut } from '@/utils/types';

async function handleKeydown(event: KeyboardEvent) {
  if (!isExpansionKey(event.key) || event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  const settings = await getSettingsFromExtension();

  if (!settings.enabled) {
    return;
  }

  const target = event.target;

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    await expandPlainTextField(event, target);
    return;
  }

  const editable = target instanceof Element ? target.closest('[contenteditable="true"]') : null;

  if (editable instanceof HTMLElement) {
    await expandContentEditable(event, editable);
  }
}

async function expandPlainTextField(
  event: KeyboardEvent,
  field: HTMLInputElement | HTMLTextAreaElement,
) {
  const caret = field.selectionStart;

  if (caret === null || field.selectionEnd !== caret) {
    return;
  }

  const shortcuts = await listShortcutsFromExtension();
  const match = findExpansion(field.value.slice(0, caret), shortcuts);

  if (!match) {
    return;
  }

  event.preventDefault();
  field.setRangeText(match.shortcut.content, match.start, match.end, 'end');
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

  const shortcuts = await listShortcutsFromExtension();
  const textBeforeCaret = beforeRange.toString();
  const match = findExpansion(textBeforeCaret, shortcuts);

  if (!match) {
    return;
  }

  event.preventDefault();
  const start = findTextPosition(editable, match.start);
  const end = findTextPosition(editable, match.end);

  if (!start || !end) {
    return;
  }

  const replaceRange = document.createRange();
  replaceRange.setStart(start.node, start.offset);
  replaceRange.setEnd(end.node, end.offset);
  replaceRange.deleteContents();
  replaceRange.insertNode(document.createTextNode(match.shortcut.content));
  replaceRange.collapse(false);
  selection.removeAllRanges();
  selection.addRange(replaceRange);
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

async function sendExtensionRequest(request: ExtensionRequest): Promise<ExtensionResponse> {
  return browser.runtime.sendMessage(request);
}

async function listShortcutsFromExtension(): Promise<Shortcut[]> {
  const response = await sendExtensionRequest({ type: 'shortcuts:list' });
  return response.shortcuts ?? [];
}

async function getSettingsFromExtension(): Promise<Settings> {
  const response = await sendExtensionRequest({ type: 'settings:get' });
  return response.settings ?? { enabled: true };
}
