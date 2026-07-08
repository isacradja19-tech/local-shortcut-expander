import { useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteShortcut,
  importShortcuts,
  listShortcuts,
  saveShortcut,
} from '@/utils/db';
import { createBackupJson, parseBackupJson } from '@/utils/backup';
import type { Shortcut, ShortcutDraft } from '@/utils/types';

const EMPTY_DRAFT: ShortcutDraft = { trigger: '/', content: '', label: '' };

function App() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [draft, setDraft] = useState<ShortcutDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshShortcuts();
  }, []);

  const filteredShortcuts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return shortcuts;
    }

    return shortcuts.filter((shortcut) => {
      return [shortcut.trigger, shortcut.label, shortcut.content]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [query, shortcuts]);

  async function refreshShortcuts() {
    setShortcuts(await listShortcuts());
  }

  function resetForm() {
    setDraft(EMPTY_DRAFT);
    setEditingId(undefined);
  }

  async function submitShortcut(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await saveShortcut(draft, editingId);
      await refreshShortcuts();
      resetForm();
      setMessage('Shortcut saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save shortcut.');
    }
  }

  function editShortcut(shortcut: Shortcut) {
    setEditingId(shortcut.id);
    setDraft({
      trigger: shortcut.trigger,
      content: shortcut.content,
      label: shortcut.label ?? '',
    });
  }

  async function removeShortcut(shortcut: Shortcut) {
    if (!shortcut.id) {
      return;
    }

    await deleteShortcut(shortcut.id);
    await refreshShortcuts();
    setMessage('Shortcut deleted.');
  }

  function exportBackup() {
    const backupJson = createBackupJson(shortcuts);
    const url = URL.createObjectURL(
      new Blob([backupJson], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'shortcut-backup.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const importedShortcuts = parseBackupJson(await file.text());
      await importShortcuts(importedShortcuts);
      await refreshShortcuts();
      setMessage(`Imported ${importedShortcuts.length} shortcut(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not import backup.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <main className="options-page">
      <section className="toolbar">
        <div>
          <h1>Easeit</h1>
          <p>{shortcuts.length} local shortcut(s)</p>
        </div>
        <div className="toolbar-actions">
          <button type="button" onClick={exportBackup} disabled={shortcuts.length === 0}>
            Export JSON
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            className="hidden-input"
            type="file"
            accept="application/json"
            onChange={importBackup}
          />
        </div>
      </section>

      <section className="editor">
        <form onSubmit={submitShortcut}>
          <label>
            Trigger
            <input
              value={draft.trigger}
              placeholder="/sig"
              onChange={(event) => setDraft({ ...draft, trigger: event.target.value })}
            />
          </label>
          <label>
            Name
            <input
              value={draft.label}
              placeholder="Email signature"
              onChange={(event) => setDraft({ ...draft, label: event.target.value })}
            />
          </label>
          <label className="wide-field">
            Text
            <textarea
              value={draft.content}
              placeholder="Thanks,&#10;Your name"
              rows={7}
              onChange={(event) => setDraft({ ...draft, content: event.target.value })}
            />
          </label>
          <div className="form-actions">
            <button type="submit">{editingId ? 'Save changes' : 'Add shortcut'}</button>
            {editingId && (
              <button type="button" className="secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="shortcut-list">
        <div className="search-row">
          <input
            value={query}
            placeholder="Search shortcuts"
            onChange={(event) => setQuery(event.target.value)}
          />
          {message && <span>{message}</span>}
        </div>

        {filteredShortcuts.map((shortcut) => (
          <article key={shortcut.id} className="shortcut-item">
            <div>
              <strong>{shortcut.trigger}</strong>
              <span>{shortcut.label || 'Untitled shortcut'}</span>
              <p>{shortcut.content}</p>
            </div>
            <div className="item-actions">
              <button type="button" className="secondary" onClick={() => editShortcut(shortcut)}>
                Edit
              </button>
              <button type="button" className="danger" onClick={() => removeShortcut(shortcut)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;
