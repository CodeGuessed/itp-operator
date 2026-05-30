import React, { useState } from 'react'
import { buildAuthUrl, previewAuthUrl, isTokenValid, REDIRECT_URI } from '../lib/gcal.js'
import { storage } from '../lib/storage.js'

const SHIFT_NOTIF_LABELS = [
  { key: 'day',    label: 'DAY shift alarm'   },
  { key: 'night',  label: 'NIGHT shift alarm' },
  { key: 'cshift', label: 'C-SHIFT alarm'     },
  { key: 'off',    label: 'OFF day alarm'      },
]

export default function Settings({ appState }) {
  const { settings, saveSettings, baselines, saveBaselines, gcalToken, gcalError } = appState

  const [anthropicKey,  setAnthropicKey]  = useState(settings.anthropicKey  || '')
  const [gcalClientId,  setGcalClientId]  = useState(settings.gcalClientId  || '')
  const [localBaselines,setLocalBaselines]= useState({ ...baselines })
  const [notifTimes,    setNotifTimes]    = useState({ ...settings.notificationTimes })
  const [clearConfirm,  setClearConfirm]  = useState(false)
  const [saveMsg,       setSaveMsg]       = useState('')
  const [authUrlPreview,setAuthUrlPreview]= useState('')

  const gcalConnected = settings.gcalConnected && isTokenValid(gcalToken)

  function flash(msg = 'Saved') { setSaveMsg(msg); setTimeout(() => setSaveMsg(''), 2500) }

  function handleSaveApiKey() { saveSettings({ ...settings, anthropicKey }); flash('API key saved') }

  async function handleConnectGcal() {
    const id = gcalClientId.trim()
    if (!id) { alert('Enter a Google OAuth Client ID first.'); return }
    saveSettings({ ...settings, gcalClientId: id })
    const url = await buildAuthUrl(id)
    window.location.href = url
  }

  async function handlePreviewAuthUrl() {
    const id = gcalClientId.trim()
    if (!id) { alert('Enter a Client ID first.'); return }
    const url = await previewAuthUrl(id)  // no side effects — does not touch stored verifier
    setAuthUrlPreview(url)
  }

  function handleDisconnectGcal() {
    storage.clearGCalToken()
    saveSettings({ ...settings, gcalConnected: false })
  }

  function handleSaveBaselines() {
    saveBaselines({
      hrv:     parseFloat(localBaselines.hrv)     || baselines.hrv,
      rhr:     parseFloat(localBaselines.rhr)     || baselines.rhr,
      sleepHr: parseFloat(localBaselines.sleepHr) || baselines.sleepHr,
      weight:  parseFloat(localBaselines.weight)  || baselines.weight,
    })
    flash('Baselines updated')
  }

  function handleSaveNotifTimes() { saveSettings({ ...settings, notificationTimes: notifTimes }); flash('Times saved') }

  function handleRequestNotifications() {
    if (!('Notification' in window)) { alert('Notifications not supported in this browser.'); return }
    Notification.requestPermission().then(p => p === 'granted' ? flash('Notifications enabled') : alert('Permission denied.'))
  }

  function handleExport() {
    const data = {
      checkins:   storage.getDailyCheckins(),
      weeklies:   storage.getWeeklyReviews(),
      baselines:  storage.getBaselines(),
      settings:   { ...storage.getSettings(), anthropicKey: '[redacted]' },
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `itp-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleClearData() {
    if (!clearConfirm) { setClearConfirm(true); return }
    ;['itp_settings','itp_daily_checkins','itp_weekly_reviews','itp_baselines','itp_gcal_cache','itp_gcal_token'].forEach(k => localStorage.removeItem(k))
    window.location.reload()
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Settings</h2>

      {saveMsg && (
        <div style={{ padding: '8px 12px', background: 'rgba(34,197,94,0.1)', border: '1px solid var(--green)', color: 'var(--green)', fontSize: '0.8rem', marginBottom: 12, fontFamily: 'Space Mono, monospace' }}>
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
            value={anthropicKey}
            onChange={e => setAnthropicKey(e.target.value)}
            placeholder="sk-ant-…"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text2)', marginBottom: 10 }}>
          Used only for weekly synthesis. Stored locally, never transmitted to ITP servers.
        </div>
        <button className="btn btn-full btn-primary" onClick={handleSaveApiKey}>Save API Key</button>
      </div>

      {/* Google Calendar */}
      <div className="card">
        <div className="card-title">Google Calendar</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span className={`status-dot ${gcalConnected ? 'green' : 'red'}`} />
          <span style={{ fontSize: '0.8rem', fontFamily: 'Space Mono, monospace' }}>
            {gcalConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Show any OAuth error from callback */}
        {gcalError && (
          <div style={{ padding: '8px 10px', border: '1px solid var(--red)', color: 'var(--red)', fontSize: '0.75rem', marginBottom: 12, fontFamily: 'Space Mono, monospace' }}>
            {gcalError}
          </div>
        )}

        <div className="input-group">
          <label className="input-label">OAuth 2.0 Client ID</label>
          <input
            type="text"
            className="input-field"
            value={gcalClientId}
            onChange={e => setGcalClientId(e.target.value)}
            placeholder="123456789-abc.apps.googleusercontent.com"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Redirect URI — must match Google Cloud Console exactly */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text2)', marginBottom: 4 }}>
            Register this exact Redirect URI in Google Cloud Console
          </div>
          <div
            style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.7rem', color: 'var(--accent)', padding: '6px 8px', background: 'var(--surface2)', border: '1px solid var(--border)', wordBreak: 'break-all', cursor: 'pointer' }}
            onClick={() => navigator.clipboard?.writeText(REDIRECT_URI).then(() => flash('Copied!'))}
            title="Tap to copy"
          >
            {REDIRECT_URI}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text2)', marginTop: 3 }}>
            Tap to copy · Also add <span className="mono" style={{ color: 'var(--text2)' }}>{window.location.origin}</span> to Authorized JavaScript Origins
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleConnectGcal}>
            {gcalConnected ? 'Reconnect' : 'Connect Google Calendar'}
          </button>
          {gcalConnected && (
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDisconnectGcal}>Disconnect</button>
          )}
        </div>

        {/* Auth URL preview for troubleshooting */}
        <button
          className="btn btn-full"
          style={{ fontSize: '0.7rem', minHeight: 36, color: 'var(--text2)', borderColor: 'var(--border)' }}
          onClick={handlePreviewAuthUrl}
        >
          Preview Auth URL (troubleshoot)
        </button>
        {authUrlPreview && (
          <div style={{ marginTop: 8, padding: '8px', background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: '0.6rem', fontFamily: 'Space Mono, monospace', wordBreak: 'break-all', color: 'var(--text2)' }}>
            {authUrlPreview}
          </div>
        )}
      </div>

      {/* Baselines */}
      <div className="card">
        <div className="card-title">Garmin Baselines</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[
            { key: 'hrv',     label: 'HRV (ms)'    },
            { key: 'rhr',     label: 'RHR (bpm)'   },
            { key: 'sleepHr', label: 'Sleep (h)'   },
            { key: 'weight',  label: 'Weight (kg)' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="input-label">{label}</label>
              <input
                type="number"
                className="input-field"
                value={localBaselines[key] || ''}
                onChange={e => setLocalBaselines(prev => ({ ...prev, [key]: e.target.value }))}
                step={key === 'sleepHr' ? '0.1' : '1'}
                style={{ fontFamily: 'Space Mono, monospace' }}
              />
            </div>
          ))}
        </div>
        <button className="btn btn-full btn-primary" onClick={handleSaveBaselines}>Update Baselines</button>
      </div>

      {/* Notification Schedule */}
      <div className="card">
        <div className="card-title">Notification Schedule</div>
        <div style={{ marginBottom: 12 }}>
          {SHIFT_NOTIF_LABELS.map(({ key, label }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <label style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text2)' }}>{label}</label>
              <input
                type="time"
                className="input-field"
                value={notifTimes[key] || '07:30'}
                onChange={e => setNotifTimes(prev => ({ ...prev, [key]: e.target.value }))}
                style={{ flex: 1, fontFamily: 'Space Mono, monospace', padding: '6px 10px' }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" style={{ flex: 1 }} onClick={handleSaveNotifTimes}>Save Times</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRequestNotifications}>Request Notifications</button>
        </div>
        <div style={{ marginTop: 10, fontSize: '0.7rem', color: 'var(--text2)' }}>
          iOS 16.4+ required. Install as PWA first via Safari → Share → Add to Home Screen.
        </div>
      </div>

      {/* Data */}
      <div className="card">
        <div className="card-title">Data</div>
        <button className="btn btn-full" style={{ marginBottom: 8 }} onClick={handleExport}>Export JSON</button>
        <button className="btn btn-full btn-danger" onClick={handleClearData}>
          {clearConfirm ? 'Tap Again to Confirm — Cannot Be Undone' : 'Clear All Data'}
        </button>
        {clearConfirm && (
          <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--red)' }}>Deletes all logs, settings, and history.</div>
        )}
      </div>

      <div style={{ padding: '8px 0', fontSize: '0.7rem', color: 'var(--text2)', fontFamily: 'Space Mono, monospace' }}>
        ITP Operator v1.0 · ITP v6.7 · Program start 2026-05-27
      </div>
    </div>
  )
}
