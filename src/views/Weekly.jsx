import React, { useState } from 'react';
import { generateWeeklySynthesis } from '../lib/claude.js';
import { getRecentDailyLogs } from '../lib/storage.js';
import { PHASE_GATE_QUESTIONS } from '../lib/program.js';

const PROTEIN_OPTS = [
  { value: 'MOST', label: 'Most Days', color: 'green' },
  { value: 'SOME', label: 'Some Days', color: 'yellow' },
  { value: 'RARELY', label: 'Rarely', color: 'red' },
];

const ALCOHOL_OPTS = [
  { value: 'NONE', label: 'None', color: 'green' },
  { value: '1-2', label: '1–2', color: 'yellow' },
  { value: '3+', label: '3+', color: 'red' },
];

const OCD_MARKERS = [
  'Daily weighing (multiple times)',
  'Calorie obsession / tracking anxiety',
  'Mirror escalation / body checking',
  'Compensatory urges (extra training)',
  'Social food avoidance',
];

function SelectRow({ label, options, value, onChange }) {
  return (
    <div className="mb-12">
      <div className="btn-row-label">{label}</div>
      <div className="btn-row">
        {options.map((opt) => (
          <button
            key={opt.value}
            className={`btn sel-${opt.color}${value === opt.value ? ' selected' : ''}`}
            onClick={() => onChange(value === opt.value ? null : opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SynthesisCard({ synthesis }) {
  if (!synthesis) return null;

  const trendClass =
    synthesis.trend === 'IMPROVING'
      ? 'green'
      : synthesis.trend === 'DECLINING'
      ? 'red'
      : 'yellow';

  return (
    <div className="synthesis-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span className={`trend-badge ${synthesis.trend}`}>{synthesis.trend}</span>
        <span className="mono text-sm" style={{ color: 'var(--text2)' }}>
          {synthesis.adherencePercent}% adherence
        </span>
      </div>

      <div className="synthesis-section">
        <div className="synthesis-label">Observation</div>
        <div className="synthesis-body">{synthesis.observation}</div>
      </div>

      <div className="synthesis-section">
        <div className="synthesis-label">Recommendation</div>
        <div className="synthesis-body">{synthesis.recommendation}</div>
      </div>

      {synthesis.flags && synthesis.flags.length > 0 && (
        <div className="synthesis-section">
          <div className="synthesis-label">Flags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {synthesis.flags.map((f, i) => (
              <span key={i} className="flag-chip">{f}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PhaseGate({ cycleWeek }) {
  const [checked, setChecked] = useState(Array(PHASE_GATE_QUESTIONS.length).fill(false));

  if (cycleWeek !== 6) return null;

  const toggle = (i) => {
    const next = [...checked];
    next[i] = !next[i];
    setChecked(next);
  };

  const passCount = checked.filter(Boolean).length;
  const passes = passCount === PHASE_GATE_QUESTIONS.length;

  return (
    <div className="card" style={{ borderColor: passes ? 'var(--green)' : 'var(--amber)' }}>
      <div className="card-title">
        Phase Gate — Cycle Week 6
        <span className="mono" style={{ float: 'right', color: passes ? 'var(--green)' : 'var(--amber)' }}>
          {passCount}/{PHASE_GATE_QUESTIONS.length}
        </span>
      </div>
      <ul className="checklist">
        {PHASE_GATE_QUESTIONS.map((q, i) => (
          <li key={i} onClick={() => toggle(i)} style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={checked[i]}
              onChange={() => toggle(i)}
              onClick={(e) => e.stopPropagation()}
            />
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
  );
}

export default function Weekly({ appState }) {
  const { settings, programPosition, weeklyLog, saveWeekly, recentLogs } = appState;

  const [weight, setWeight] = useState(weeklyLog?.weight || '');
  const [sessions, setSessions] = useState(weeklyLog?.sessions || 0);
  const [protein, setProtein] = useState(weeklyLog?.protein || null);
  const [alcohol, setAlcohol] = useState(weeklyLog?.alcohol || null);
  const [ocdMarkers, setOcdMarkers] = useState(
    weeklyLog?.ocdMarkers || Array(OCD_MARKERS.length).fill(false)
  );

  const [synthesis, setSynthesis] = useState(weeklyLog?.synthesis || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function toggleOcd(i) {
    const next = [...ocdMarkers];
    next[i] = !next[i];
    setOcdMarkers(next);
  }

  async function handleGenerate() {
    if (!settings.apiKey) {
      setError('No Anthropic API key set. Add it in Settings.');
      return;
    }
    setLoading(true);
    setError(null);

    const weekData = {
      programPosition,
      dailyLogs: recentLogs,
      weeklyInput: { weight, sessions, protein, alcohol, ocdMarkers },
      baselines: appState.baselines,
    };

    try {
      const result = await generateWeeklySynthesis(settings.apiKey, weekData);
      setSynthesis(result);
      saveWeekly({ weight, sessions, protein, alcohol, ocdMarkers, synthesis: result });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSaveDraft() {
    saveWeekly({ weight, sessions, protein, alcohol, ocdMarkers, synthesis });
  }

  return (
    <div>
      <div className="top-strip">
        <div className="top-strip-item">
          <span className="top-strip-label">Phase</span>
          <span className="top-strip-value">{programPosition.phase}</span>
        </div>
        <div className="top-strip-item">
          <span className="top-strip-label">Cycle Wk</span>
          <span className="top-strip-value mono">{programPosition.cycleWeek}</span>
        </div>
        <div className="top-strip-item">
          <span className="top-strip-label">Program Wk</span>
          <span className="top-strip-value mono">{programPosition.week}</span>
        </div>
      </div>

      <PhaseGate cycleWeek={programPosition.cycleWeek} />

      <div className="card">
        <div className="card-title">Weekly Review</div>

        {/* Weight */}
        <div className="input-group">
          <label className="input-label">Weight (kg)</label>
          <input
            type="number"
            className="input-field"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 82.4"
            step="0.1"
            min="40"
            max="200"
          />
        </div>

        {/* Sessions counter */}
        <div className="mb-12">
          <div className="btn-row-label">Sessions Completed</div>
          <div className="session-counter">
            <button
              className="btn"
              onClick={() => setSessions(Math.max(0, sessions - 1))}
            >
              −
            </button>
            <span className="count mono">{sessions}/3</span>
            <button
              className="btn"
              onClick={() => setSessions(Math.min(3, sessions + 1))}
            >
              +
            </button>
          </div>
        </div>

        <SelectRow label="Protein Compliance" options={PROTEIN_OPTS} value={protein} onChange={setProtein} />
        <SelectRow label="Alcohol" options={ALCOHOL_OPTS} value={alcohol} onChange={setAlcohol} />

        {/* OCD markers */}
        <div className="mb-12">
          <div className="btn-row-label">OCD Risk Markers</div>
          <div className="ocd-grid">
            {OCD_MARKERS.map((marker, i) => (
              <button
                key={i}
                className={`ocd-toggle${ocdMarkers[i] ? ' active' : ''}`}
                onClick={() => toggleOcd(i)}
              >
                {marker}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" style={{ flex: 1 }} onClick={handleSaveDraft}>
            Save Draft
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? 'Generating…' : 'Generate Weekly Synthesis'}
          </button>
        </div>

        {error && <div className="error-text mt-8">{error}</div>}
      </div>

      <SynthesisCard synthesis={synthesis} />
    </div>
  );
}
