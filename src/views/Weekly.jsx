import React, { useState } from 'react'
import { generateWeeklySynthesis } from '../lib/claude.js'
import { storage } from '../lib/storage.js'
import { detectFailureModes } from '../lib/program.js'

// Phase gate questions (cycle week 6 only)
const GATE_QUESTIONS = [
  'Sleep averaging ≥7h for last 4 weeks',
  'HRV trending stable or improving',
  'All 3 sessions completed in ≥4 of 6 weeks',
  'No persistent injury flags',
  'Weight within 2kg of phase target',
  'Protein target met most days',
  'No OCD escalation markers active',
]

const PROTEIN_OPTS = [
  { value: 'Most',   label: 'Most Days', color: 'green'  },
  { value: 'Some',   label: 'Some Days', color: 'yellow' },
  { value: 'Rarely', label: 'Rarely',    color: 'red'    },
]
const ALCOHOL_OPTS = [
  { value: 0, label: 'None', color: 'green'  },
  { value: 1, label: '1–2',  color: 'yellow' },
  { value: 3, label: '3+',   color: 'red'    },
]
const OCD_MARKERS = [
  'Daily weighing (multiple times)',
  'Calorie obsession / tracking anxiety',
  'Mirror escalation / body checking',
  'Compensatory urges (extra training)',
  'Social food avoidance',
]

function SelectRow({ label, options, value, onChange }) {
  return (
    <div className="mb-12">
      <div className="btn-row-label">{label}</div>
      <div className="btn-row">
        {options.map(opt => (
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

function PhaseGate({ cycleWeek }) {
  const [checked, setChecked] = useState(Array(GATE_QUESTIONS.length).fill(false))
  if (cycleWeek !== 6) return null
  const toggle = i => { const n = [...checked]; n[i] = !n[i]; setChecked(n) }
  const passCount = checked.filter(Boolean).length
  const passes = passCount === GATE_QUESTIONS.length
  return (
    <div className="card" style={{ borderColor: passes ? 'var(--green)' : 'var(--amber)' }}>
      <div className="card-title">
        Phase Gate — Cycle Week 6
        <span className="mono" style={{ float: 'right', color: passes ? 'var(--green)' : 'var(--amber)' }}>
          {passCount}/{GATE_QUESTIONS.length}
        </span>
      </div>
      <ul className="checklist">
        {GATE_QUESTIONS.map((q, i) => (
          <li key={i} onClick={() => toggle(i)} style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={checked[i]} onChange={() => toggle(i)} onClick={e => e.stopPropagation()} />
            <span>{q}</span>
          </li>
        ))}
      </ul>
      {passes && (
        <div style={{ marginTop: 12, color: 'var(--green)', fontSize: '0.8rem', fontWeight: 700 }}>
          GATE CLEARED — advance to next phase
        </div>
      )}
    </div>
  )
}

function SynthesisCard({ s }) {
  if (!s) return null
  const trendColor = s.recoveryTrend === 'Improving' ? 'green' : s.recoveryTrend === 'Degrading' ? 'red' : 'yellow'
  return (
    <div className="synthesis-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span className={`trend-badge ${s.recoveryTrend?.toUpperCase()}`}>{s.recoveryTrend}</span>
        <span className="mono text-sm" style={{ color: 'var(--text2)' }}>{s.adherenceRate} adherence</span>
      </div>

      {s.recoveryNote && (
        <div className="synthesis-section">
          <div className="synthesis-label">Recovery Status</div>
          <div className="synthesis-body">{s.recoveryNote}</div>
        </div>
      )}
      <div className="synthesis-section">
        <div className="synthesis-label">Observation</div>
        <div className="synthesis-body">{s.observation}</div>
      </div>
      <div className="synthesis-section">
        <div className="synthesis-label">Recommendation</div>
        <div className="synthesis-body">{s.recommendation}</div>
      </div>
      {s.activeFlags?.length > 0 && (
        <div className="synthesis-section">
          <div className="synthesis-label">Active Flags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {s.activeFlags.map((f, i) => <span key={i} className="flag-chip">{f}</span>)}
          </div>
        </div>
      )}
      {s.phaseGateNote && (
        <div className="synthesis-section">
          <div className="synthesis-label">Phase Gate</div>
          <div className="synthesis-body" style={{ color: s.phaseGateReady ? 'var(--green)' : 'var(--amber)' }}>
            {s.phaseGateNote}
          </div>
        </div>
      )}
    </div>
  )
}

// Derive the current week key (Sunday ISO date)
function getWeekKey() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export default function Weekly({ appState }) {
  const { settings, baselines, programPosition } = appState

  const weekKey = getWeekKey()
  const existing = storage.getWeeklyReviews().find(w => w.weekKey === weekKey) || {}

  const [weight, setWeight] = useState(existing.weight || '')
  const [sessionsCompleted, setSessionsCompleted] = useState(existing.sessionsCompleted ?? 0)
  const [proteinRate, setProteinRate] = useState(existing.proteinRate || null)
  const [alcoholDays, setAlcoholDays] = useState(existing.alcoholDays ?? null)
  const [ocdMarkers, setOcdMarkers] = useState(existing.ocdMarkers || Array(OCD_MARKERS.length).fill(false))
  const [synthesis, setSynthesis] = useState(existing.synthesis || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const recentCheckins = storage.getRecentCheckins(7)
  const recentWeeklies = storage.getRecentWeeklyReviews(3)
  const activeFailureModes = detectFailureModes(recentCheckins, recentWeeklies)

  function toggleOcd(i) { const n = [...ocdMarkers]; n[i] = !n[i]; setOcdMarkers(n) }

  function saveDraft(synth = synthesis) {
    storage.saveWeeklyReview({
      weekKey, weight, sessionsCompleted, sessionsScheduled: 3,
      proteinRate, alcoholDays, ocdMarkers, synthesis: synth,
    })
  }

  async function handleGenerate() {
    if (!settings.anthropicKey) { setError('No Anthropic API key set. Add it in Settings.'); return }
    setLoading(true); setError(null)
    try {
      const result = await generateWeeklySynthesis({
        checkins: recentCheckins,
        weeklies: recentWeeklies,
        baselines,
        programPosition,
        apiKey: settings.anthropicKey,
      })
      setSynthesis(result)
      saveDraft(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
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
          <span className="top-strip-label">Wk</span>
          <span className="top-strip-value mono">{programPosition.week}/6</span>
        </div>
      </div>

      {activeFailureModes.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--red)' }}>
          <div className="card-title" style={{ color: 'var(--red)' }}>Active Failure Modes</div>
          {activeFailureModes.map(m => (
            <div key={m.id} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{m.action}</div>
            </div>
          ))}
        </div>
      )}

      <PhaseGate cycleWeek={programPosition.week} />

      <div className="card">
        <div className="card-title">Weekly Review — {weekKey}</div>

        <div className="input-group">
          <label className="input-label">Weight (kg)</label>
          <input
            type="number"
            className="input-field"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            placeholder="e.g. 82.4"
            step="0.1" min="40" max="200"
          />
        </div>

        <div className="mb-12">
          <div className="btn-row-label">Sessions Completed</div>
          <div className="session-counter">
            <button className="btn" onClick={() => setSessionsCompleted(Math.max(0, sessionsCompleted - 1))}>−</button>
            <span className="count mono">{sessionsCompleted}/3</span>
            <button className="btn" onClick={() => setSessionsCompleted(Math.min(3, sessionsCompleted + 1))}>+</button>
          </div>
        </div>

        <SelectRow label="Protein Compliance" options={PROTEIN_OPTS} value={proteinRate} onChange={setProteinRate} />
        <SelectRow label="Alcohol Days" options={ALCOHOL_OPTS} value={alcoholDays} onChange={setAlcoholDays} />

        <div className="mb-12">
          <div className="btn-row-label">OCD Risk Markers</div>
          <div className="ocd-grid">
            {OCD_MARKERS.map((marker, i) => (
              <button key={i} className={`ocd-toggle${ocdMarkers[i] ? ' active' : ''}`} onClick={() => toggleOcd(i)}>
                {marker}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => saveDraft()}>Save Draft</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating…' : 'Generate Weekly Synthesis'}
          </button>
        </div>
        {error && <div className="error-text mt-8">{error}</div>}
      </div>

      <SynthesisCard s={synthesis} />
    </div>
  )
}
