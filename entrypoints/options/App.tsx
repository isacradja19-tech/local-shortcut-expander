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
type MessageTone = 'success' | 'error';

function App() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [draft, setDraft] = useState<ShortcutDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<MessageTone>('success');
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

  function showMessage(text: string, tone: MessageTone = 'success') {
    setMessage(text);
    setMessageTone(tone);
  }

  async function submitShortcut(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await saveShortcut(draft, editingId);
      await refreshShortcuts();
      resetForm();
      showMessage(editingId ? 'Shortcut updated.' : 'Shortcut added.');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Could not save shortcut.', 'error');
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

    const confirmed = window.confirm(`Delete ${shortcut.trigger}? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    await deleteShortcut(shortcut.id);
    await refreshShortcuts();
    showMessage('Shortcut deleted.');
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
    showMessage('Backup exported.');
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
      showMessage(`Imported ${importedShortcuts.length} shortcut(s).`);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Could not import backup.', 'error');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <main className="options-page">
      <section className="toolbar">
        <div>
          <h1>Easeit</h1>
          <p>Create local text shortcuts that expand while you type.</p>
        </div>
        <div className="toolbar-actions">
          <button type="button" onClick={exportBackup} disabled={shortcuts.length === 0}>
            Export backup
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Import backup
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

      <p className="support-note">
        Works in most normal text fields. Some complex editors such as Google Docs may not be supported yet.
      </p>

      <section className="editor">
        <h2>{editingId ? 'Edit shortcut' : 'Create shortcut'}</h2>
        <form onSubmit={submitShortcut}>
          <label>
            Trigger, such as /sig
            <input
              aria-describedby="trigger-help"
              value={draft.trigger}
              placeholder="/sig"
              onChange={(event) => setDraft({ ...draft, trigger: event.target.value })}
            />
            <span id="trigger-help" className="field-help">
              Start with a slash. Expand it by typing the trigger followed by space, tab, or enter.
            </span>
          </label>
          <label>
            Name, optional
            <input
              value={draft.label}
              placeholder="Email signature"
              onChange={(event) => setDraft({ ...draft, label: event.target.value })}
            />
          </label>
          <label className="wide-field">
            Text to insert
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
          <label className="search-label">
            <span className="sr-only">Search shortcuts</span>
            <input
              value={query}
              placeholder="Search shortcuts"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {message && (
            <span className={`message ${messageTone}`} role="status">
              {message}
            </span>
          )}
        </div>

        {shortcuts.length === 0 && (
          <div className="empty-state">
            <h2>No shortcuts yet</h2>
            <p>Create your first shortcut above. Try `/sig` for an email signature.</p>
          </div>
        )}

        {shortcuts.length > 0 && filteredShortcuts.length === 0 && (
          <div className="empty-state">
            <h2>No matches</h2>
            <p>Try a different search term.</p>
          </div>
        )}

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
