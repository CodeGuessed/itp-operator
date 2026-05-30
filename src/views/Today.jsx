import React, { useState } from 'react'
import { computePrescription } from '../lib/program.js'

// Colour class from hex shortcut — prescription level → CSS class
const LEVEL_CLASS = {
  FULL: 'green',
  SHORT: 'yellow',
  ZONE2: 'amber',
  REST: 'red',
  DIVE_PROTOCOL: 'blue',
}

const HRV_OPTS = [
  { value: '<55',   label: '<55',    color: 'red'   },
  { value: '55-65', label: '55–65',  color: 'amber' },
  { value: '65-75', label: '65–75',  color: 'yellow'},
  { value: '75+',   label: '75+',    color: 'green' },
]
const SLEEP_OPTS = [
  { value: '<5h',  label: '<5h',  color: 'red'   },
  { value: '5-6h', label: '5–6h', color: 'amber' },
  { value: '6-7h', label: '6–7h', color: 'yellow'},
  { value: '7h+',  label: '7h+',  color: 'green' },
]
const REM_OPTS = [
  { value: '<60',  label: '<60min', color: 'amber' },
  { value: '>=60', label: '≥60min', color: 'green' },
]
const RHR_OPTS = [
  { value: '>51',   label: 'Elevated >51', color: 'red'   },
  { value: '47-51', label: 'Normal 47–51', color: 'yellow'},
  { value: '43-46', label: 'Good 43–46',   color: 'green' },
  { value: '<43',   label: 'Low <43',      color: 'blue'  },
]
const SUBJECTIVE_OPTS = [
  { value: 'low',     label: 'Low',     color: 'red'   },
  { value: 'neutral', label: 'Neutral', color: 'yellow'},
  { value: 'good',    label: 'Good',    color: 'green' },
]
const SHIFT_OPTS = [
  { value: 'DAY',    label: 'DAY'   },
  { value: 'NIGHT',  label: 'NIGHT' },
  { value: 'CSHIFT', label: 'C'     },
  { value: 'OFF',    label: 'OFF'   },
]
const EOD_RESULTS = [
  { value: true,  label: 'Completed', color: 'green'  },
  { value: false, label: 'Skipped',   color: 'red'    },
]
const EOD_LOAD = [
  { value: 'hit',      label: 'Hit Target', color: 'green' },
  { value: 'below',    label: 'Below',      color: 'yellow'},
  { value: 'exceeded', label: 'Exceeded',   color: 'amber' },
]
const EOD_FLAGS = [
  { value: 'none',       label: 'None',       color: 'green' },
  { value: 'knee',       label: 'Knee',       color: 'amber' },
  { value: 'fatigue',    label: 'Fatigue',    color: 'amber' },
  { value: 'motivation', label: 'Motivation', color: 'yellow'},
]

function SelectRow({ label, options, value, onChange }) {
  return (
    <div className="mb-12">
      <div className="btn-row-label">{label}</div>
      <div className="btn-row">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            className={`btn sel-${opt.color}${value === opt.value ? ' selected' : ''}`}
            onClick={() => onChange(value === opt.value ? null : opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function PrescriptionCard({ rx }) {
  if (!rx) return null
  const cls = LEVEL_CLASS[rx.level] || 'green'
  return (
    <div className={`rx-card ${cls}`}>
      <div className={`rx-label ${cls}`}>{rx.label}</div>
      <ul className="rx-sessions">
        {rx.sessions.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
      <div className="rx-rationale">{rx.rationale}</div>
      {rx.flags?.length > 0 && (
        <div className="rx-flags">
          {rx.flags.map((f) => (
            <span key={f.key} className="flag-chip">{f.msg}</span>
          ))}
        </div>
      )}
      {rx.suppressBodyBattery && (
        <div className="suppression-notice">BODY BATTERY — suppressed (night/c-shift window)</div>
      )}
    </div>
  )
}

function EodCard({ existing, onSave }) {
  const [sessionCompleted, setSessionCompleted] = useState(existing?.sessionCompleted ?? null)
  const [loadRating, setLoadRating] = useState(existing?.loadRating || null)
  const [eodFlag, setEodFlag] = useState(existing?.eodFlag || null)

  return (
    <div className="card">
      <div className="card-title">End-of-Day Log</div>
      <SelectRow
        label="Session Result"
        options={EOD_RESULTS}
        value={sessionCompleted}
        onChange={setSessionCompleted}
      />
      <SelectRow label="Load" options={EOD_LOAD} value={loadRating} onChange={setLoadRating} />
      <SelectRow label="Flag" options={EOD_FLAGS} value={eodFlag} onChange={setEodFlag} />
      <button
        className="btn btn-full btn-primary"
        disabled={sessionCompleted === null}
        onClick={() => onSave({ sessionCompleted, loadRating, eodFlag })}
      >
        {existing ? 'Update Log' : 'Save Log'}
      </button>
    </div>
  )
}

export default function Today({ appState }) {
  const { programPosition, todayCheckin, saveCheckin, todayShift, baselines } = appState

  // Initialise form from saved checkin or imported-calendar shift.
  // OT / Dive auto-enable from the calendar when not already logged.
  const [form, setForm] = useState(() => ({
    hrv:           todayCheckin?.hrv           || null,
    sleep:         todayCheckin?.sleep         || null,
    rem:           todayCheckin?.rem           || null,
    rhr:           todayCheckin?.rhr           || null,
    shiftType:     todayCheckin?.shiftType     || todayShift?.type || null,
    otOccurred:    todayCheckin?.otOccurred    ?? !!todayShift?.isOT,
    diveDay:       todayCheckin?.diveDay       ?? (todayShift?.type === 'DIVE' || !!todayShift?.isDive),
    subjectiveFeel:todayCheckin?.subjectiveFeel|| null,
  }))

  const [rx, setRx] = useState(todayCheckin?.prescription || null)
  const [showEod, setShowEod] = useState(!!todayCheckin?.prescription)

  function set(field, val) { setForm(prev => ({ ...prev, [field]: val })) }

  function handleGenerate() {
    const required = ['hrv', 'sleep', 'rem', 'rhr', 'shiftType']
    if (required.some(k => !form[k])) {
      alert('Complete all check-in rows before generating prescription.')
      return
    }
    const result = computePrescription({ ...form, baselines })
    setRx(result)
    setShowEod(true)
    saveCheckin({ ...form, prescription: result })
  }

  function handleEodSave(eodData) {
    saveCheckin({ ...form, prescription: rx, ...eodData })
  }

  const dateStr = new Date().toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div>
      {/* Top strip */}
      <div className="top-strip">
        <div className="top-strip-item">
          <span className="top-strip-label">Phase</span>
          <span className="top-strip-value">{programPosition.phase}</span>
        </div>
        <div className="top-strip-item">
          <span className="top-strip-label">Cycle</span>
          <span className="top-strip-value mono">{programPosition.cycle}</span>
        </div>
        <div className="top-strip-item">
          <span className="top-strip-label">Week</span>
          <span className="top-strip-value mono">{programPosition.week}</span>
        </div>
        <div className="top-strip-item" style={{ marginLeft: 'auto' }}>
          <span className="top-strip-label">Date</span>
          <span className="top-strip-value">{dateStr}</span>
        </div>
      </div>

      {/* Calendar shift context + overrides */}
      <div className="gcal-strip">
        <span className="gcal-detected">
          {todayShift?.type && todayShift.type !== 'OFF'
            ? <>Calendar: <strong>{todayShift.type}</strong>{todayShift.isOT ? ' +OT' : ''}</>
            : todayShift?.isOT
              ? <>Calendar: <strong>OT</strong></>
              : 'Calendar: OFF / no shift'}
        </span>
        {SHIFT_OPTS.map(opt => (
          <button
            key={opt.value}
            className={`btn${form.shiftType === opt.value ? ' selected' : ''}`}
            style={{ minHeight: 34, fontSize: '0.65rem', padding: '4px 10px' }}
            onClick={() => set('shiftType', opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Morning check-in */}
      <div className="card">
        <div className="card-title">Morning Check-in</div>
        <SelectRow label="HRV on Wake" options={HRV_OPTS} value={form.hrv} onChange={v => set('hrv', v)} />
        <SelectRow label="Sleep Duration" options={SLEEP_OPTS} value={form.sleep} onChange={v => set('sleep', v)} />
        <SelectRow label="REM Sleep" options={REM_OPTS} value={form.rem} onChange={v => set('rem', v)} />
        <SelectRow label="RHR vs Baseline" options={RHR_OPTS} value={form.rhr} onChange={v => set('rhr', v)} />
        <SelectRow label="Subjective Feel" options={SUBJECTIVE_OPTS} value={form.subjectiveFeel} onChange={v => set('subjectiveFeel', v)} />

        <div className="btn-row-label" style={{ marginTop: 4 }}>Modifiers</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            className={`btn btn-toggle flex-1${form.otOccurred ? ' active' : ''}`}
            onClick={() => set('otOccurred', !form.otOccurred)}
          >OT</button>
          <button
            className={`btn btn-toggle flex-1${form.diveDay ? ' active' : ''}`}
            onClick={() => set('diveDay', !form.diveDay)}
          >DIVE DAY</button>
        </div>

        <button className="btn btn-full btn-primary" onClick={handleGenerate} style={{ marginTop: 4 }}>
          Get Today's Prescription
        </button>
      </div>

      <PrescriptionCard rx={rx} />

      {showEod && (
        <EodCard
          existing={todayCheckin?.sessionCompleted !== undefined ? todayCheckin : null}
          onSave={handleEodSave}
        />
      )}
    </div>
  )
}
