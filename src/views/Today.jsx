import React from 'react';
import { formatProgramDate } from '../lib/program.js';

const HRV_OPTS = [
  { value: '<55', label: '<55', color: 'red' },
  { value: '55-65', label: '55–65', color: 'amber' },
  { value: '65-75', label: '65–75', color: 'yellow' },
  { value: '75+', label: '75+', color: 'green' },
];

const SLEEP_OPTS = [
  { value: '<5h', label: '<5h', color: 'red' },
  { value: '5-6h', label: '5–6h', color: 'amber' },
  { value: '6-7h', label: '6–7h', color: 'yellow' },
  { value: '7h+', label: '7h+', color: 'green' },
];

const REM_OPTS = [
  { value: '<60', label: '<60min', color: 'amber' },
  { value: '>=60', label: '≥60min', color: 'green' },
];

const RHR_OPTS = [
  { value: '>51', label: 'Elevated >51', color: 'red' },
  { value: '47-51', label: 'Normal 47–51', color: 'yellow' },
  { value: '43-46', label: 'Good 43–46', color: 'green' },
  { value: '<43', label: 'Low <43', color: 'blue' },
];

const SUBJECTIVE_OPTS = [
  { value: 'low', label: 'Low', color: 'red' },
  { value: 'neutral', label: 'Neutral', color: 'yellow' },
  { value: 'good', label: 'Good', color: 'green' },
];

const SHIFT_OPTS = [
  { value: 'DAY', label: 'DAY' },
  { value: 'NIGHT', label: 'NIGHT' },
  { value: 'CSHIFT', label: 'C' },
  { value: 'OFF', label: 'OFF' },
];

const EOD_RESULTS = [
  { value: 'COMPLETED', label: 'Completed', color: 'green' },
  { value: 'PARTIAL', label: 'Partial', color: 'yellow' },
  { value: 'SKIPPED', label: 'Skipped', color: 'red' },
];

const EOD_LOAD = [
  { value: 'HIT', label: 'Hit Target', color: 'green' },
  { value: 'BELOW', label: 'Below', color: 'yellow' },
  { value: 'EXCEEDED', label: 'Exceeded', color: 'amber' },
];

const EOD_FLAGS = [
  { value: 'NONE', label: 'None', color: 'green' },
  { value: 'KNEE', label: 'Knee', color: 'amber' },
  { value: 'FATIGUE', label: 'Fatigue', color: 'amber' },
  { value: 'MOTIVATION', label: 'Motivation', color: 'yellow' },
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

function PrescriptionCard({ prescription, bodyBatterySuppressed }) {
  if (!prescription) return null;
  const { level, sessions, flags, rationale } = prescription;

  return (
    <div className={`rx-card ${level.color}`}>
      <div className={`rx-label ${level.color}`}>{level.label}</div>
      <ul className="rx-sessions">
        {sessions.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
      <div className="rx-rationale">{rationale}</div>
      {flags.length > 0 && (
        <div className="rx-flags">
          {flags.map((f) => (
            <span key={f} className="flag-chip">{f}</span>
          ))}
        </div>
      )}
      {bodyBatterySuppressed && (
        <div className="suppression-notice">
          BODY BATTERY — suppressed (night/c-shift window)
        </div>
      )}
    </div>
  );
}

function EodCard({ eod, onSave }) {
  const [result, setResult] = React.useState(eod?.result || null);
  const [load, setLoad] = React.useState(eod?.load || null);
  const [flag, setFlag] = React.useState(eod?.flag || null);

  function handleSave() {
    if (!result) return;
    onSave({ result, load, flag });
  }

  return (
    <div className="card">
      <div className="card-title">End-of-Day Log</div>
      <SelectRow label="Session Result" options={EOD_RESULTS} value={result} onChange={setResult} />
      <SelectRow label="Load" options={EOD_LOAD} value={load} onChange={setLoad} />
      <SelectRow label="Flag" options={EOD_FLAGS} value={flag} onChange={setFlag} />
      <button className="btn btn-full btn-primary" onClick={handleSave} disabled={!result}>
        {eod ? 'Update Log' : 'Save Log'}
      </button>
    </div>
  );
}

export default function Today({ appState }) {
  const {
    programPosition,
    today,
    checkIn,
    updateCheckIn,
    prescription,
    generatePrescription,
    eod,
    saveEod,
    bodyBatterySuppressed,
    gcalShift,
    gcalLoading,
  } = appState;

  const dateStr = formatProgramDate(today);

  function handleGenerate() {
    const ci = checkIn;
    if (!ci.hrv || !ci.sleep || !ci.rem || !ci.rhr || !ci.shiftType) {
      alert('Complete all check-in fields before generating prescription.');
      return;
    }
    generatePrescription();
  }

  const gcalDetected = gcalShift
    ? gcalShift.shiftType
    : null;

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
        {programPosition.isDeload && (
          <div style={{ width: '100%' }}>
            <span className="flag-chip" style={{ borderColor: 'var(--blue)', color: 'var(--blue)' }}>
              DELOAD WEEK
            </span>
          </div>
        )}
      </div>

      {/* GCal context row */}
      <div className="gcal-strip">
        <span className="gcal-detected">
          {gcalLoading ? (
            'GCal loading…'
          ) : gcalDetected ? (
            <>GCal: <strong>{gcalDetected}</strong></>
          ) : (
            'GCal: no shift detected'
          )}
        </span>
        {SHIFT_OPTS.map((opt) => (
          <button
            key={opt.value}
            className={`btn${checkIn.shiftType === opt.value ? ' selected' : ''}`}
            style={{ minHeight: 34, fontSize: '0.65rem', padding: '4px 10px' }}
            onClick={() => updateCheckIn('shiftType', opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Morning check-in card */}
      <div className="card">
        <div className="card-title">Morning Check-in</div>

        <SelectRow
          label="HRV on Wake"
          options={HRV_OPTS}
          value={checkIn.hrv}
          onChange={(v) => updateCheckIn('hrv', v)}
        />
        <SelectRow
          label="Sleep Duration"
          options={SLEEP_OPTS}
          value={checkIn.sleep}
          onChange={(v) => updateCheckIn('sleep', v)}
        />
        <SelectRow
          label="REM Sleep"
          options={REM_OPTS}
          value={checkIn.rem}
          onChange={(v) => updateCheckIn('rem', v)}
        />
        <SelectRow
          label="RHR vs Baseline"
          options={RHR_OPTS}
          value={checkIn.rhr}
          onChange={(v) => updateCheckIn('rhr', v)}
        />
        <SelectRow
          label="Subjective Feel"
          options={SUBJECTIVE_OPTS}
          value={checkIn.subjective}
          onChange={(v) => updateCheckIn('subjective', v)}
        />

        {/* Toggles */}
        <div className="btn-row-label" style={{ marginTop: 4 }}>Modifiers</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            className={`btn btn-toggle flex-1${checkIn.otOccurred ? ' active' : ''}`}
            onClick={() => updateCheckIn('otOccurred', !checkIn.otOccurred)}
          >
            OT
          </button>
          <button
            className={`btn btn-toggle flex-1${checkIn.diveDay ? ' active' : ''}`}
            onClick={() => updateCheckIn('diveDay', !checkIn.diveDay)}
          >
            DIVE DAY
          </button>
        </div>

        <button
          className="btn btn-full btn-primary"
          onClick={handleGenerate}
          style={{ marginTop: 4 }}
        >
          Get Today's Prescription
        </button>
      </div>

      {/* Prescription */}
      <PrescriptionCard
        prescription={prescription}
        bodyBatterySuppressed={bodyBatterySuppressed}
      />

      {/* EOD log — shown after prescription generated */}
      {prescription && (
        <EodCard eod={eod} onSave={saveEod} />
      )}
    </div>
  );
}
