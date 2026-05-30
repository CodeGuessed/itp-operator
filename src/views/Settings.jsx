import React, { useState, useRef } from 'react'
import { storage } from '../lib/storage.js'

const SHIFT_NOTIF_LABELS = [
  { key: 'day',    label: 'DAY shift alarm'   },
  { key: 'night',  label: 'NIGHT shift alarm' },
  { key: 'cshift', label: 'C-SHIFT alarm'     },
  { key: 'off',    label: 'OFF day alarm'      },
]

export default function Settings({ appState }) {
  const { settings, saveSettings, baselines, saveBaselines, importIcs, clearShifts, importInfo } = appState

  const [anthropicKey,  setAnthropicKey]  = useState(settings.anthropicKey  || '')
  const [localBaselines,setLocalBaselines]= useState({ ...baselines })
  const [notifTimes,    setNotifTimes]    = useState({ ...settings.notificationTimes })
  const [clearConfirm,  setClearConfirm]  = useState(false)
  const [saveMsg,       setSaveMsg]       = useState('')
  const [importMsg,     setImportMsg]     = useState(null)
  const fileInputRef = useRef(null)

  function flash(msg = 'Saved') { setSaveMsg(msg); setTimeout(() => setSaveMsg(''), 2500) }

  function handleSaveApiKey() { saveSettings({ ...settings, anthropicKey }); flash('API key saved') }

  function handleFilePick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const result = importIcs(String(reader.result), file.name)
        setImportMsg({
          ok: true,
          text: `${file.name}: scanned ${result.scanned} events, added ${result.added} shifts (${result.total} total).`,
        })
      } catch (err) {
        setImportMsg({ ok: false, text: `Failed to parse ${file.name}: ${err.message}` })
      }
    }
    reader.onerror = () => setImportMsg({ ok: false, text: 'Could not read file.' })
    reader.readAsText(file)
    e.target.value = ''  // allow re-importing the same file
  }

  function handleClearShifts() {
    clearShifts()
    setImportMsg({ ok: true, text: 'Imported shifts cleared.' })
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
    ;['itp_settings','itp_daily_checkins','itp_weekly_reviews','itp_baselines','itp_shift_events'].forEach(k => localStorage.removeItem(k))
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

      {/* Shift Calendar Import (.ics) */}
      <div className="card">
        <div className="card-title">Shift Calendar (.ics import)</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span className={`status-dot ${importInfo.count > 0 ? 'green' : 'red'}`} />
          <span style={{ fontSize: '0.8rem', fontFamily: 'Space Mono, monospace' }}>
            {importInfo.count > 0
              ? `${importInfo.count} shifts loaded`
              : 'No shifts imported'}
          </span>
        </div>

        {importInfo.importedAt && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text2)', marginBottom: 10, fontFamily: 'Space Mono, monospace' }}>
            Last import: {new Date(importInfo.importedAt).toLocaleDateString('en-NZ')} {importInfo.lastFile ? `· ${importInfo.lastFile}` : ''}
          </div>
        )}

        {importMsg && (
          <div style={{ padding: '8px 10px', border: `1px solid var(--${importMsg.ok ? 'green' : 'red'})`, color: `var(--${importMsg.ok ? 'green' : 'red'})`, fontSize: '0.72rem', marginBottom: 12, fontFamily: 'Space Mono, monospace', lineHeight: 1.5 }}>
            {importMsg.text}
          </div>
        )}

        <div style={{ fontSize: '0.72rem', color: 'var(--text2)', marginBottom: 12, lineHeight: 1.5 }}>
          Export your work calendar as an <span className="mono">.ics</span> file and load it here. Shifts are detected from event titles
          (<span className="mono">[N]</span>=Night, <span className="mono">[D]</span>=Day, <span className="mono">[C]</span>/C-Shift, Dive, <span className="mono">[OT]</span>).
          Re-import anytime to refresh; entries merge and de-duplicate.
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".ics,text/calendar"
          onChange={handleFilePick}
          style={{ display: 'none' }}
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => fileInputRef.current?.click()}>
            Import .ics File
          </button>
          {importInfo.count > 0 && (
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleClearShifts}>Clear</button>
          )}
        </div>
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
