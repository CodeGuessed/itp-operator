import React, { useState } from 'react';
import { getCurrentPhaseTargets, SHIFT_TRAINING_RULES } from '../lib/program.js';

const FAILURE_MODES = [
  {
    mode: 'Sleep debt accumulation',
    signal: 'HRV <55 for 3+ consecutive days',
    response: 'Mandatory REST for 2 days. Review shift schedule.',
  },
  {
    mode: 'OT overload',
    signal: 'OT flag + HRV flag same day',
    response: 'ZONE 2 max. No strength work until both clear.',
  },
  {
    mode: 'Night shift desync',
    signal: 'NIGHT shift + sleep <6h on return day',
    response: 'REST day prescribed automatically.',
  },
  {
    mode: 'Dive fatigue',
    signal: 'Dive day within 48h of training',
    response: 'Dive protocol overrides. No breath-hold 24h post-dive.',
  },
  {
    mode: 'Protein deficit stall',
    signal: '3+ weeks RARELY protein + no weight progress',
    response: 'Adjust food timing, not calories. Review meal prep.',
  },
  {
    mode: 'OCD escalation',
    signal: '3+ OCD markers active any single week',
    response: 'Reduce tracking granularity. Weekly weigh-in only.',
  },
  {
    mode: 'Motivation collapse',
    signal: 'MOTIVATION flag 2+ consecutive days',
    response: 'Review phase targets. Check sleep debt accumulation first.',
  },
  {
    mode: 'Knee irritation',
    signal: 'KNEE flag 3+ consecutive days',
    response: 'Remove knee-dominant loading. Substitute upper/posterior chain.',
  },
  {
    mode: 'HRV baseline drift',
    signal: 'HRV below personal baseline for 2+ weeks',
    response: 'Audit sleep quality, alcohol, stress load. May need deload.',
  },
  {
    mode: 'Weight stall (genuine)',
    signal: '4+ weeks no change, protein/sleep adequate',
    response: 'Reduce calories 100–150kcal/day. Reassess in 2 weeks.',
  },
  {
    mode: 'C-shift overtraining',
    signal: 'CSHIFT + FULL prescribed repeatedly',
    response: 'CSHIFT defaults to SHORT. Review engine rule application.',
  },
  {
    mode: 'Phase gate failure',
    signal: '≥3 gate questions unchecked at week 6',
    response: 'Extend current phase 1 additional week. Do not advance.',
  },
];

const STALL_DECISION_TREE = [
  {
    step: 1,
    question: 'Is sleep averaging <6.5h?',
    yes: 'Address sleep first. Weight stall is secondary. Fix shift timing or sleep hygiene.',
    no: 'Proceed to step 2.',
  },
  {
    step: 2,
    question: 'Is protein hitting target most days?',
    yes: 'Proceed to step 3.',
    no: 'Protein deficit stall. Fix adherence before adjusting calories.',
  },
  {
    step: 3,
    question: 'Did dive load occur in last 7 days?',
    yes: 'Dive-induced water retention possible. Assess again in 5–7 days.',
    no: 'Proceed to step 4.',
  },
  {
    step: 4,
    question: 'Has stall persisted 4+ weeks with sleep and protein adequate?',
    yes: 'Genuine stall. Reduce calories 100–150kcal/day. Reassess in 2 weeks.',
    no: 'Not a genuine stall. Continue current approach.',
  },
];

function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 4 }}>
      <button
        className="collapsible-header"
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '12px 0' }}
      >
        <h3 style={{ color: 'var(--text)' }}>{title}</h3>
        <span className={`collapsible-chevron${open ? ' open' : ''}`}>▼</span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
}

function StallProtocol() {
  return (
    <div>
      {STALL_DECISION_TREE.map((item) => (
        <div key={item.step} style={{ marginBottom: 14 }}>
          <div style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}>
            <span className="mono" style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              padding: '2px 8px',
              fontSize: '0.75rem',
              flexShrink: 0,
              color: 'var(--accent)',
            }}>
              {item.step}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 6 }}>
                {item.question}
              </div>
              <div style={{ fontSize: '0.8rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--green)', fontWeight: 700 }}>YES: </span>
                <span style={{ color: 'var(--text2)' }}>{item.yes}</span>
              </div>
              <div style={{ fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text2)', fontWeight: 700 }}>NO: </span>
                <span style={{ color: 'var(--text2)' }}>{item.no}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
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
  );
}

function PhaseRules({ programPosition }) {
  const targets = getCurrentPhaseTargets();

  return (
    <div>
      {targets && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text2)', marginBottom: 2 }}>
                Calories
              </div>
              <div className="mono" style={{ fontSize: '0.9rem' }}>
                {targets.calories.base}
                <span style={{ color: 'var(--text2)', fontSize: '0.75rem' }}>
                  {' '}(−{targets.calories.deficit} deficit)
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text2)', marginBottom: 2 }}>
                Protein
              </div>
              <div className="mono" style={{ fontSize: '0.9rem' }}>
                {targets.protein}g
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 8, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text2)' }}>
        Training Rules by Shift
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Shift</th>
            <th>Window</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(SHIFT_TRAINING_RULES).map(([shift, rule]) => (
            <tr key={shift}>
              <td className="mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>{shift}</td>
              <td className="mono" style={{ fontSize: '0.75rem' }}>{rule.window}</td>
              <td style={{ color: 'var(--text2)', fontSize: '0.75rem' }}>{rule.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Reference({ appState }) {
  const { programPosition } = appState;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 4 }}>Quick Reference</h2>
        <div style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>
          {programPosition.phaseLabel || programPosition.phase} · Wk {programPosition.week}
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
  );
}
