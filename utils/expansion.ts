const TRIGGER_PATTERN = /(?:^|\s)(\/[A-Za-z0-9_-]+)$/;

export function isExpansionKey(key: string) {
  return key === ' ' || key === 'Tab' || key === 'Enter';
}

export function findTriggerBeforeCaret(textBeforeCaret: string) {
  const match = textBeforeCaret.match(TRIGGER_PATTERN);
  return match?.[1] ?? null;
}

export function findDelimitedTriggerBeforeCaret(textBeforeCaret: string) {
  const match = textBeforeCaret.match(/(?:^|\s)(\/[A-Za-z0-9_-]+)([ \t\n])$/);

  if (!match) {
    return null;
  }

  return {
    trigger: match[1],
    delimiterLength: match[2].length,
  };
}
