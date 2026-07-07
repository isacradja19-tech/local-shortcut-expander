import { describe, expect, it } from 'vitest';
import { createBackupJson, parseBackupJson } from './backup';

describe('backup JSON', () => {
  it('round trips valid shortcut drafts', () => {
    const json = createBackupJson([
      { trigger: '/sig', content: 'Thanks', label: 'Signature' },
    ]);

    expect(parseBackupJson(json)).toEqual([
      { trigger: '/sig', content: 'Thanks', label: 'Signature' },
    ]);
  });

  it('rejects unknown backup shapes', () => {
    expect(() => parseBackupJson('{"shortcuts":[]}')).toThrow(
      'Choose a version 1 shortcut backup file.',
    );
  });

  it('filters invalid shortcut rows but keeps valid rows', () => {
    const json = JSON.stringify({
      version: 1,
      shortcuts: [
        { trigger: 'bad', content: 'Nope' },
        { trigger: '/ok', content: 'Works' },
      ],
    });

    expect(parseBackupJson(json)).toEqual([{ trigger: '/ok', content: 'Works' }]);
  });
});
