import { useEffect, useState } from 'react';
import { getSettings, saveSettings } from '@/utils/settings';
import './App.css';

function App() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings()
      .then((settings) => setEnabled(settings.enabled))
      .finally(() => setLoading(false));
  }, []);

  async function toggleEnabled() {
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    await saveSettings({ enabled: nextEnabled });
  }

  function openOptionsPage() {
    browser.runtime.openOptionsPage();
  }

  return (
    <main className="popup">
      <header>
        <h1>Easeit</h1>
        <p>Create local text shortcuts that expand while you type.</p>
      </header>

      <section className="status-panel" aria-live="polite">
        <div>
          <span className="status-label">Expansion</span>
          <strong>{enabled ? 'On' : 'Off'}</strong>
        </div>
        <label className="switch">
          <input
            aria-label="Enable shortcut expansion"
            checked={enabled}
            disabled={loading}
            type="checkbox"
            onChange={toggleEnabled}
          />
          <span>{enabled ? 'Enabled' : 'Disabled'}</span>
        </label>
      </section>

      <p className="support-note">
        Works in most normal text fields. Some complex editors such as Google Docs may not be supported yet.
      </p>

      <button type="button" onClick={openOptionsPage}>
        Manage shortcuts
      </button>
    </main>
  );
}

export default App;
