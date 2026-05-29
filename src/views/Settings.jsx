import React, { useState } from 'react';
import { initiateOAuthFlow, isTokenValid, tokenExpiresIn } from '../lib/gcal.js';
import { exportAllData, clearAllData, DEFAULT_SETTINGS } from '../lib/storage.js';

const SHIFT_LABELS = {
  DAY: 'DAY shift alarm',
  NIGHT: 'NIGHT shift alarm',
  CSHIFT: 'C-SHIFT alarm',
  OFF: 'OFF day alarm',
  SUNDAY: 'Sunday review',
};

export default function Settings({ appState }) {
  const { settings, updateSettings, baselines, updateBaselines } = appState;

  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [gcalClientId, setGcalClientId] = useState(settings.gcalClientId || '');
  const [localBaselines, setLocalBaselines] = useState({ ...baselines });
  const [notifTimes, setNotifTimes] = useState({ ...settings.notificationTimes });
  const [clearConfirm, setClearConfirm] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const gcalConnected = isTokenValid(settings.gcalToken);
  const gcalMinutes = tokenExpiresIn(settings.gcalToken);

  function showSaved(msg = 'Saved') {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 2000);
  }

  function handleSaveApiKey() {
    updateSettings({ apiKey });
    showSaved('API key saved');
  }

  function handleConnectGcal() {
    if (!gcalClientId.trim()) {
      alert('Enter a Google OAuth Client ID first.');
      return;
    }
    updateSettings({ gcalClientId });
    initiateOAuthFlow(gcalClientId.trim());
  }

  function handleDisconnectGcal() {
    updateSettings({ gcalToken: null });
  }

  function handleSaveBaselines() {
    updateBaselines({
      hrv: parseFloat(localBaselines.hrv) || baselines.hrv,
      rhr: parseFloat(localBaselines.rhr) || baselines.rhr,
      sleep: parseFloat(localBaselines.sleep) || baselines.sleep,
    });
    showSaved('Baselines updated');
  }

  function handleSaveNotifTimes() {
    updateSettings({ notificationTimes: notifTimes });
    showSaved('Notification times saved');
  }

  function handleRequestNotifications() {
    if (!('Notification' in window)) {
      alert('Notifications not supported in this browser.');
      return;
    }
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        showSaved('Notifications enabled');
      } else {
        alert('Notification permission denied.');
      }
    });
  }

  function handleExport() {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `itp-operator-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClearData() {
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    clearAllData();
    setClearConfirm(false);
    window.location.reload();
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Settings</h2>

      {saveMsg && (
        <div style={{
          padding: '8px 12px',
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid var(--green)',
          color: 'var(--green)',
          fontSize: '0.8rem',
          marginBottom: 12,
          fontFamily: 'Space Mono, monospace',
        }}>
          {saveMsg}
        </div>
      )}

      {/* Anthropic API Key */}
      <div className="card">
        <div className="card-title">Anthropic API Key</div>
        <div className="input-group">
          <input
            type="password"
            className="input-field"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text2)', marginBottom: 10 }}>
          Used only for weekly synthesis. Stored locally, never transmitted to ITP servers.
        </div>
        <button className="btn btn-full btn-primary" onClick={handleSaveApiKey}>
          Save API Key
        </button>
      </div>

      {/* Google Calendar */}
      <div className="card">
        <div className="card-title">Google Calendar</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span className={`status-dot ${gcalConnected ? 'green' : 'red'}`} />
          <span style={{ fontSize: '0.8rem', fontFamily: 'Space Mono, monospace' }}>
            {gcalConnected
              ? `Connected — expires in ${gcalMinutes}min`
              : 'Disconnected'}
          </span>
        </div>

        <div className="input-group">
          <label className="input-label">OAuth 2.0 Client ID</label>
          <input
            type="text"
            className="input-field"
            value={gcalClientId}
            onChange={(e) => setGcalClientId(e.target.value)}
            placeholder="123456789.apps.googleusercontent.com"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={handleConnectGcal}
          >
            {gcalConnected ? 'Reconnect GCal' : 'Connect Google Calendar'}
          </button>
          {gcalConnected && (
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDisconnectGcal}>
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Baselines */}
      <div className="card">
        <div className="card-title">Garmin Baselines</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[
            { key: 'hrv', label: 'HRV (ms)' },
            { key: 'rhr', label: 'RHR (bpm)' },
            { key: 'sleep', label: 'Sleep (h)' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="input-label">{label}</label>
              <input
                type="number"
                className="input-field"
                value={localBaselines[key]}
                onChange={(e) => setLocalBaselines((prev) => ({ ...prev, [key]: e.target.value }))}
                step={key === 'sleep' ? '0.1' : '1'}
                style={{ fontFamily: 'Space Mono, monospace' }}
              />
            </div>
          ))}
        </div>
        <button className="btn btn-full btn-primary" onClick={handleSaveBaselines}>
          Update Baselines
        </button>
      </div>

      {/* Notification Times */}
      <div className="card">
        <div className="card-title">Notification Schedule</div>
        <div style={{ marginBottom: 12 }}>
          {Object.entries(SHIFT_LABELS).map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <label style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text2)' }}>{label}</label>
              <input
                type="time"
                className="input-field"
                value={notifTimes[key] || '07:30'}
                onChange={(e) => setNotifTimes((prev) => ({ ...prev, [key]: e.target.value }))}
                style={{ flex: 1, fontFamily: 'Space Mono, monospace', padding: '6px 10px' }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" style={{ flex: 1 }} onClick={handleSaveNotifTimes}>
            Save Times
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRequestNotifications}>
            Request Notifications
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: '0.7rem', color: 'var(--text2)' }}>
          iOS 16.4+ required. Install as PWA first via Safari → Share → Add to Home Screen.
        </div>
      </div>

      {/* Data Management */}
      <div className="card">
        <div className="card-title">Data</div>
        <button className="btn btn-full" style={{ marginBottom: 8 }} onClick={handleExport}>
          Export JSON
        </button>
        <button
          className={`btn btn-full btn-danger`}
          onClick={handleClearData}
        >
          {clearConfirm ? 'Tap Again to Confirm Clear All Data' : 'Clear All Data'}
        </button>
        {clearConfirm && (
          <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--red)' }}>
            This will delete all logs, settings, and history. Cannot be undone.
          </div>
        )}
      </div>

      {/* App info */}
      <div style={{ padding: '8px 0', fontSize: '0.7rem', color: 'var(--text2)', fontFamily: 'Space Mono, monospace' }}>
        ITP Operator v1.0 · FlyinL0w · 42-week program from 2026-05-27
      </div>
    </div>
  );
}
