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
        <h1>Shortcuts</h1>
        <p>{enabled ? 'Expansion is on' : 'Expansion is off'}</p>
      </header>

      <label className="switch">
        <input
          checked={enabled}
          disabled={loading}
          type="checkbox"
          onChange={toggleEnabled}
        />
        <span>{enabled ? 'Enabled' : 'Disabled'}</span>
      </label>

      <button type="button" onClick={openOptionsPage}>
        Manage shortcuts
      </button>
    </main>
  );
}

export default App;
