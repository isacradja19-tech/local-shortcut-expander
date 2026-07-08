/** Borne la longueur d'un trigger, et donc le texte analysé à chaque frappe. */
export const MAX_TRIGGER_LENGTH = 64;

const TRIGGER_PREFIX = '/';
const TRIGGER_BODY = 'A-Za-z0-9_-';

const BOUNDARY = '\\s(\\[{<>"\'`,;:\\u200b\\ufeff';

const TRIGGER_PATTERN = new RegExp(
  `(?:^|[${BOUNDARY}])(${TRIGGER_PREFIX}[${TRIGGER_BODY}]{1,${MAX_TRIGGER_LENGTH}})$`,
);

const VALID_TRIGGER_PATTERN = new RegExp(
  `^${TRIGGER_PREFIX}[${TRIGGER_BODY}]{1,${MAX_TRIGGER_LENGTH}}$`,
);


const SCAN_WINDOW = MAX_TRIGGER_LENGTH + 2;

export const EXPANSION_KEYS: ReadonlySet<string> = new Set([' ', 'Tab', 'Enter']);

export function isExpansionKey(key: string): boolean {
  return EXPANSION_KEYS.has(key);
}

export function findTriggerBeforeCaret(textBeforeCaret: string): string | null {
  const tail = textBeforeCaret.slice(-SCAN_WINDOW);
  return tail.match(TRIGGER_PATTERN)?.[1] ?? null;
}

/** Pour l'éditeur de raccourcis : `/sig` valide, `sig` ou `/mon sig` non. */
export function isValidTrigger(value: string): boolean {
  return VALID_TRIGGER_PATTERN.test(value);
}

export function normalizeTrigger(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return '';
  }

  return trimmed.startsWith(TRIGGER_PREFIX) ? trimmed : `${TRIGGER_PREFIX}${trimmed}`;
}