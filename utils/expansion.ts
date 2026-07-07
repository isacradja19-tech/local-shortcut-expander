import type { Shortcut } from './types';

const TRIGGER_PATTERN = /(?:^|\s)(\/[A-Za-z0-9_-]+)$/;

export type ExpansionMatch = {
  shortcut: Shortcut;
  start: number;
  end: number;
};

export function isExpansionKey(key: string) {
  return key === ' ' || key === 'Tab' || key === 'Enter';
}

export function findTriggerBeforeCaret(textBeforeCaret: string) {
  const match = textBeforeCaret.match(TRIGGER_PATTERN);
  return match?.[1] ?? null;
}

export function findExpansion(
  textBeforeCaret: string,
  shortcuts: Shortcut[],
): ExpansionMatch | null {
  const trigger = findTriggerBeforeCaret(textBeforeCaret);

  if (!trigger) {
    return null;
  }

  const shortcut = shortcuts.find((item) => item.trigger === trigger);

  if (!shortcut) {
    return null;
  }

  return {
    shortcut,
    start: textBeforeCaret.length - trigger.length,
    end: textBeforeCaret.length,
  };
}
