import React, { useState } from 'react'
import { PHASES, runStallCheck } from '../lib/program.js'
import { storage } from '../lib/storage.js'

// Static shift training rules (not in canonical program.js — defined here)
const SHIFT_TRAINING_RULES = [
  { shift: 'DAY',    window: '18:30–20:30', notes: 'Post-shift. Moderate intensity OK if HRV normal.' },
  { shift: 'NIGHT',  window: '13:00–15:00', notes: 'Pre-shift only. Low-moderate intensity. No high CNS load.' },
  { shift: 'CSHIFT', window: 'N/A',         notes: 'Shortened session or rest. Shift spans prime recovery window.' },
  { shift: 'OFF',    window: 'Flexible',    notes: 'Preferred training day. Full session if recovery permits.' },
]

// All 12 static failure modes
const FAILURE_MODES = [
  { mode: 'Sleep debt accumulation',   signal: 'HRV <55 for 3+ consecutive days',              response: 'Mandatory REST 2 days. Review shift schedule.' },
  { mode: 'OT overload',               signal: 'OT flag + HRV flag same day',                  response: 'Zone 2 max. No strength until both clear.' },
  { mode: 'Night shift desync',         signal: 'NIGHT shift + sleep <6h on return day',        response: 'REST day prescribed automatically.' },
  { mode: 'Dive fatigue',               signal: 'Dive day within 48h of training',              response: 'Dive protocol overrides. No breath-hold 24h post-dive.' },
  { mode: 'Protein deficit stall',      signal: '3+ weeks RARELY + no weight progress',         response: 'Adjust food timing, not calories. Review meal prep.' },
  { mode: 'OCD escalation',             signal: '≥2 OCD markers active any single week',        response: 'Reduce tracking granularity. Weekly weigh-in only.' },
  { mode: 'Motivation collapse',         signal: 'MOTIVATION flag 2+ consecutive days',         response: 'Review phase targets. Check sleep debt accumulation first.' },
  { mode: 'Knee irritation',            signal: 'KNEE flag 3+ consecutive days',                response: 'Remove knee-dominant loading. Substitute upper/posterior chain.' },
  { mode: 'HRV baseline drift',         signal: 'HRV below baseline for 2+ weeks',             response: 'Audit sleep quality, alcohol, stress. May need deload.' },
  { mode: 'Weight stall (genuine)',     signal: '4+ weeks no change, protein/sleep adequate',   response: 'Reduce calories 100–150kcal/day. Reassess in 2 weeks.' },
  { mode: 'C-shift overtraining',       signal: 'CSHIFT + FULL prescribed repeatedly',          response: 'CSHIFT defaults to SHORT. Review engine rule application.' },
  { mode: 'Phase gate failure',         signal: '≥3 gate questions unchecked at week 6',        response: 'Extend current phase 1 additional week. Do not advance.' },
]

function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 4 }}>
      <button
        className="collapsible-header"
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '12px 0' }}
      >
        <h3 style={{ color: 'var(--text)' }}>{title}</h3>
        <span className={`collapsible-chevron${open ? ' open' : ''}`}>▼</span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  )
}

function StallProtocol() {
  const weeklies = storage.getRecentWeeklyReviews(4)
  const checkins = storage.getRecentCheckins(7)

  // Compute sleep avg from last 7 days
  const sleepMap = { '<5h': 4.5, '5-6h': 5.5, '6-7h': 6.5, '7h+': 7.5 }
  const sleepPts = checkins.map(c => sleepMap[c.sleep]).filter(Boolean)
  const sleepAvg = sleepPts.length ? sleepPts.reduce((a, b) => a + b, 0) / sleepPts.length : 7

  const lastWeekly = weeklies[weeklies.length - 1]
  const proteinHit = lastWeekly?.proteinRate || 'Most'
  const diveCountWeek = checkins.filter(c => c.diveDay).length

  const result = runStallCheck({ sleepAvg, proteinHit, diveCountWeek })

  const causeColor = { sleep: 'red', protein: 'amber', dives: 'amber', genuine: 'yellow' }[result.cause]

  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: 12 }}>
        Auto-computed from last 7 days of data.
      </div>
      <div style={{ padding: '12px', border: `1px solid var(--${causeColor})`, marginBottom: 12 }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: `var(--${causeColor})`, marginBottom: 6 }}>
          {result.cause === 'genuine' ? 'Genuine Stall' : `Likely Cause: ${result.cause}`}
        </div>
        <div style={{ fontSize: '0.875rem' }}>{result.message}</div>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>
        Sleep avg 7d: <span className="mono">{sleepAvg.toFixed(1)}h</span> &nbsp;·&nbsp;
        Protein last wk: <span className="mono">{proteinHit}</span> &nbsp;·&nbsp;
        Dives 7d: <span className="mono">{diveCountWeek}</span>
      </div>
    </div>
  )
}

function FailureModes() {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '28%' }}>Mode</th>
            <th style={{ width: '36%' }}>Signal</th>
            <th style={{ width: '36%' }}>Response</th>
          </tr>
        </thead>
        <tbody>
          {FAILURE_MODES.map((row, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 700, fontSize: '0.8rem' }}>{row.mode}</td>
              <td style={{ color: 'var(--amber)', fontSize: '0.75rem', fontFamily: 'Space Mono, monospace' }}>{row.signal}</td>
              <td style={{ color: 'var(--text2)', fontSize: '0.75rem' }}>{row.response}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PhaseRules({ programPosition }) {
  const currentPhase = PHASES.find(p => p.name === programPosition.phase) || PHASES[0]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text2)', marginBottom: 8 }}>
          Current Phase Targets — {currentPhase.name}
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text2)', marginBottom: 2 }}>Calories</div>
            <div className="mono" style={{ fontSize: '1rem' }}>{currentPhase.calories.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text2)', marginBottom: 2 }}>Protein</div>
            <div className="mono" style={{ fontSize: '1rem' }}>{currentPhase.protein[0]}–{currentPhase.protein[1]}g</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 8, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text2)' }}>
        All Phase Targets
      </div>
      <table className="data-table" style={{ marginBottom: 16 }}>
        <thead><tr><th>Phase</th><th>Dates</th><th>kcal</th><th>Protein</th></tr></thead>
        <tbody>
          {PHASES.map(p => (
            <tr key={p.name} style={{ opacity: p.name === programPosition.phase ? 1 : 0.5 }}>
              <td className="mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>{p.name}</td>
              <td style={{ fontSize: '0.7rem', color: 'var(--text2)' }}>{p.start}<br />{p.end}</td>
              <td className="mono" style={{ fontSize: '0.8rem' }}>{p.calories.toLocaleString()}</td>
              <td className="mono" style={{ fontSize: '0.8rem' }}>{p.protein[0]}–{p.protein[1]}g</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginBottom: 8, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text2)' }}>
        Training Rules by Shift
      </div>
      <table className="data-table">
        <thead><tr><th>Shift</th><th>Window</th><th>Notes</th></tr></thead>
        <tbody>
          {SHIFT_TRAINING_RULES.map(r => (
            <tr key={r.shift}>
              <td className="mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>{r.shift}</td>
              <td className="mono" style={{ fontSize: '0.75rem' }}>{r.window}</td>
              <td style={{ color: 'var(--text2)', fontSize: '0.75rem' }}>{r.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Reference({ appState }) {
  const { programPosition } = appState

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 4 }}>Quick Reference</h2>
        <div style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>
          {programPosition.phase} · Cycle {programPosition.cycle} · Week {programPosition.week}
        </div>
      </div>

      <div className="card" style={{ padding: '0 16px' }}>
        <Collapsible title="Stall Protocol" defaultOpen={true}>
          <StallProtocol />
        </Collapsible>
        <div style={{ borderTop: '1px solid var(--border)' }} />
        <Collapsible title="Failure Modes (12)">
          <FailureModes />
        </Collapsible>
        <div style={{ borderTop: '1px solid var(--border)' }} />
        <Collapsible title="Phase Rules">
          <PhaseRules programPosition={programPosition} />
        </Collapsible>
      </div>
    </div>
  )
}
