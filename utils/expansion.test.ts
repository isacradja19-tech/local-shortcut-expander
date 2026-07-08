import { describe, expect, it } from 'vitest';
import {
  findDelimitedTriggerBeforeCaret,
  findTriggerBeforeCaret,
  isExpansionKey,
} from './expansion';

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

  it('finds a trigger after a delimiter has already been inserted', () => {
    expect(findDelimitedTriggerBeforeCaret('Hello /sig ')).toEqual({
      trigger: '/sig',
      delimiterLength: 1,
    });
  });
});
