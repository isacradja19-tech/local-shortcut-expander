import { describe, expect, it } from 'vitest';
import {
  findDelimitedTriggerBeforeCaret,
  findExpansion,
  findTriggerBeforeCaret,
  isExpansionKey,
} from './expansion';
import type { Shortcut } from './types';

const shortcuts: Shortcut[] = [
  {
    id: 1,
    trigger: '/sig',
    content: 'Thanks,\nAvery',
    createdAt: 1,
    updatedAt: 1,
  },
];

describe('expansion matching', () => {
  it('recognizes expansion delimiter keys', () => {
    expect(isExpansionKey(' ')).toBe(true);
    expect(isExpansionKey('Tab')).toBe(true);
    expect(isExpansionKey('Enter')).toBe(true);
    expect(isExpansionKey('a')).toBe(false);
  });

  it('finds a slash trigger immediately before the caret', () => {
    expect(findTriggerBeforeCaret('Please use /sig')).toBe('/sig');
  });

  it('does not match a trigger inside another word', () => {
    expect(findTriggerBeforeCaret('email/test')).toBeNull();
  });

  it('returns the replacement range for a known shortcut', () => {
    expect(findExpansion('Hello /sig', shortcuts)).toEqual({
      shortcut: shortcuts[0],
      start: 6,
      end: 10,
    });
  });

  it('finds a trigger after a delimiter has already been inserted', () => {
    expect(findDelimitedTriggerBeforeCaret('Hello /sig ')).toEqual({
      trigger: '/sig',
      delimiterLength: 1,
    });
  });
});
