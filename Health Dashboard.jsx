import { useState } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";

// ── Parsed data from FIT files ──────────────────────────────────────────────

const SLEEP = {
  date: "May 30, 2026",
  window: { start: "07:00", end: "10:50", totalH: 3.83 },
  scores: {
    overall: 78,
    quality: 77,
    recovery: 86,
    duration: 87,
    deep: 93,
    light: 75,
    rem: 65,
    restlessness: 92,
    awakeScore: 59,
    awakeTimeScore: 45,
    awakeningsCountScore: 74,
    interruptionsScore: 66,
  },
  awakeningsCount: 2,
  avgStressDuringSleep: 13.5,
};

const HRV = {
  summary: {
    last5minHigh: 57.0,
    weeklyAverage: 47.0,
    baselineLow: 38,
    baselineUpper: 58,
    lastNight5minHigh: 80.0,
    status: "balanced",
  },
  hourly: [
    { hour: "03:00", mean: 54.4, min: 42, max: 71, n: 12 },
    { hour: "04:00", mean: 35.5, min: 20, max: 50, n: 12 },
    { hour: "05:00", mean: 59.2, min: 31, max: 82, n: 12 },
    { hour: "06:00", mean: 78.9, min: 57, max: 93, n: 12 },
    { hour: "07:00", mean: 72.3, min: 51, max: 84, n: 9 },
    { hour: "08:00", mean: 104.7, min: 94, max: 121, n: 10 },
    { hour: "09:00", mean: 78.8, min: 52, max: 102, n: 12 },
    { hour: "10:00", mean: 102.6, min: 87, max: 128, n: 10 },
  ],
};

const SKIN_TEMP = {
  avgC: 35.53,
  baselineOffset: 0.143,
  acclimationPct: 0.0555,
  hourly: [
    { hour: "19:00", mean: -0.85, min: -1.82, max: -0.27 },
    { hour: "20:00", mean: -2.18, min: -2.73, max: -1.74 },
    { hour: "21:00", mean: -2.49, min: -3.60, max: -1.70 },
    { hour: "22:00", mean: -0.98, min: -1.79, max: -0.54 },
    { hour: "23:00", mean: -1.40, min: -2.10, max: -1.01 },
    { hour: "00:00", mean: -2.20, min: -2.58, max: -1.74 },
    { hour: "01:00", mean: -5.24, min: -8.62, max: -1.96 },
    { hour: "02:00", mean: -2.68, min: -3.82, max: -1.76 },
    { hour: "03:00", mean: -1.10, min: -2.60, max: 0.56 },
    { hour: "04:00", mean: -1.02, min: -2.03, max: 0.28 },
    { hour: "05:00", mean: -2.43, min: -2.74, max: -2.04 },
    { hour: "06:00", mean: -2.66, min: -3.26, max: -1.60 },
    { hour: "07:00", mean: -3.03, min: -4.11, max: -1.88 },
    { hour: "08:00", mean: -1.80, min: -3.11, max: -0.45 },
    { hour: "09:00", mean: -3.71, min: -4.45, max: -2.97 },
    { hour: "10:00", mean: -1.05, min: -2.84, max: -0.33 },
  ],
};

// ── Styles ───────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Syne:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #0a0b0e;
    color: #e8e4dc;
    font-family: 'DM Mono', monospace;
    min-height: 100vh;
  }

  :root {
    --bg: #0a0b0e;
    --bg2: #111318;
    --bg3: #181b22;
    --border: #242830;
    --muted: #4a5060;
    --text: #e8e4dc;
    --text2: #9a95a0;
    --accent: #7fd9c4;
    --accent2: #f0a868;
    --accent3: #c97aff;
    --danger: #ff6b6b;
    --good: #7fd9c4;
  }

  .dash {
    max-width: 1100px;
    margin: 0 auto;
    padding: 28px 24px 60px;
  }

  .header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 36px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
  }

  .header-title {
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text2);
  }

  .header-date {
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.1em;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 14px;
  }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 14px;
  }

  .grid-1 {
    margin-bottom: 14px;
  }

  .card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 20px 22px 18px;
    position: relative;
    overflow: hidden;
  }

  .card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
  }

  .card-label {
    font-size: 9.5px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 12px;
    font-weight: 500;
  }

  .big-num {
    font-family: 'Syne', sans-serif;
    font-size: 52px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.03em;
  }

  .big-num-unit {
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    font-weight: 300;
    color: var(--text2);
    margin-left: 6px;
    letter-spacing: 0.05em;
  }

  .big-num-sub {
    font-size: 11px;
    color: var(--muted);
    margin-top: 6px;
    letter-spacing: 0.05em;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-top: 8px;
  }

  .status-balanced { background: rgba(127,217,196,0.12); color: var(--accent); border: 1px solid rgba(127,217,196,0.25); }
  .status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

  .score-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-top: 4px;
  }

  .score-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .score-name {
    font-size: 9.5px;
    color: var(--muted);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .score-val {
    font-family: 'Syne', sans-serif;
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
  }

  .score-bar {
    height: 2px;
    border-radius: 2px;
    background: var(--bg3);
    overflow: hidden;
  }

  .score-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.6s ease;
  }

  .chart-wrap {
    margin-top: 14px;
    height: 140px;
  }

  .chart-wrap-tall {
    margin-top: 14px;
    height: 180px;
  }

  .tab-row {
    display: flex;
    gap: 4px;
    margin-bottom: 14px;
  }

  .tab-btn {
    padding: 5px 14px;
    border-radius: 6px;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition: all 0.15s;
  }

  .tab-btn.active {
    background: var(--bg3);
    color: var(--text);
    border-color: var(--border);
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
  }

  .stat-row:last-child { border-bottom: none; }

  .stat-key {
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .stat-val {
    font-family: 'Syne', sans-serif;
    font-size: 14px;
    font-weight: 600;
  }

  .section-divider {
    font-size: 9px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--muted);
    padding: 6px 0 14px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .section-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  .inline-note {
    font-size: 10px;
    color: var(--muted);
    font-style: italic;
    margin-top: 8px;
    line-height: 1.5;
  }

  .hrv-range-bar {
    position: relative;
    height: 6px;
    background: var(--bg3);
    border-radius: 3px;
    margin: 16px 0 8px;
  }

  .hrv-range-fill {
    position: absolute;
    height: 100%;
    border-radius: 3px;
    background: linear-gradient(90deg, var(--accent2), var(--accent));
  }

  .hrv-marker {
    position: absolute;
    top: -5px;
    width: 2px;
    height: 16px;
    border-radius: 1px;
    transform: translateX(-50%);
  }

  .hrv-axis {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: var(--muted);
    margin-top: 4px;
  }

  .sleep-bar-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .sleep-bar-label {
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted);
    width: 80px;
    text-align: right;
    flex-shrink: 0;
  }

  .sleep-bar-track {
    flex: 1;
    height: 4px;
    background: var(--bg3);
    border-radius: 2px;
    overflow: hidden;
  }

  .sleep-bar-fill {
    height: 100%;
    border-radius: 2px;
  }

  .sleep-bar-score {
    font-family: 'Syne', sans-serif;
    font-size: 12px;
    font-weight: 600;
    width: 28px;
    text-align: right;
    flex-shrink: 0;
  }
`;

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(v) {
  if (v >= 90) return "#7fd9c4";
  if (v >= 75) return "#a8d8a8";
  if (v >= 60) return "#f0a868";
  return "#ff6b6b";
}

function SleepScoreBar({ label, value }) {
  return (
    <div className="sleep-bar-row">
      <div className="sleep-bar-label">{label}</div>
      <div className="sleep-bar-track">
        <div
          className="sleep-bar-fill"
          style={{ width: `${value}%`, background: scoreColor(value) }}
        />
      </div>
      <div className="sleep-bar-score" style={{ color: scoreColor(value) }}>
        {value}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, unit = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#181b22", border: "1px solid #242830", borderRadius: 6,
      padding: "8px 12px", fontSize: 11, fontFamily: "'DM Mono', monospace"
    }}>
      <div style={{ color: "#9a95a0", marginBottom: 4, letterSpacing: "0.08em" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "#e8e4dc" }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}{unit}
        </div>
      ))}
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function HealthDashboard() {
  const [chartView, setChartView] = useState("hrv");

  const HRV_MAX = 130;
  const baselineLow = HRV.summary.baselineLow;
  const baselineUpper = HRV.summary.baselineUpper;
  const weeklyAvg = HRV.summary.weeklyAverage;
  const lastNight = HRV.summary.last5minHigh;

  return (
    <>
      <style>{css}</style>
      <div className="dash">
        <div className="header">
          <div>
            <div className="header-title">Health · Recovery Report</div>
            <div className="header-date" style={{ marginTop: 4 }}>Garmin Device · {SLEEP.date}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#4a5060", letterSpacing: "0.1em" }}>
              11 FIT files parsed
            </div>
          </div>
        </div>

        {/* ── Row 1: Key numbers ── */}
        <div className="section-divider">Sleep</div>
        <div className="grid-3">
          {/* Overall Sleep Score */}
          <div className="card">
            <div className="card-label">Overall Sleep Score</div>
            <div>
              <span className="big-num" style={{ color: scoreColor(SLEEP.scores.overall) }}>
                {SLEEP.scores.overall}
              </span>
              <span className="big-num-unit">/ 100</span>
            </div>
            <div className="big-num-sub">{SLEEP.window.start} – {SLEEP.window.end} UTC</div>
            <div className="big-num-sub" style={{ marginTop: 4 }}>
              {SLEEP.window.totalH.toFixed(1)}h recorded · {SLEEP.awakeningsCount} awakenings
            </div>
          </div>

          {/* Recovery */}
          <div className="card">
            <div className="card-label">Recovery Score</div>
            <div>
              <span className="big-num" style={{ color: scoreColor(SLEEP.scores.recovery) }}>
                {SLEEP.scores.recovery}
              </span>
              <span className="big-num-unit">/ 100</span>
            </div>
            <div className="big-num-sub" style={{ marginTop: 6 }}>Stress during sleep</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 600, color: "#f0a868", marginTop: 2 }}>
              {SLEEP.avgStressDuringSleep} <span style={{ fontFamily: "'DM Mono'", fontSize: 11, color: "#4a5060" }}>avg stress</span>
            </div>
          </div>

          {/* Deep Sleep */}
          <div className="card">
            <div className="card-label">Sleep Stage Scores</div>
            <div className="score-grid">
              {[
                ["Deep", SLEEP.scores.deep],
                ["REM", SLEEP.scores.rem],
                ["Light", SLEEP.scores.light],
                ["Restless", SLEEP.scores.restlessness],
              ].map(([name, val]) => (
                <div className="score-item" key={name}>
                  <div className="score-name">{name}</div>
                  <div className="score-val" style={{ color: scoreColor(val) }}>{val}</div>
                  <div className="score-bar">
                    <div className="score-fill" style={{ width: `${val}%`, background: scoreColor(val) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Sleep score breakdown ── */}
        <div className="grid-2">
          <div className="card">
            <div className="card-label">Sleep Score Breakdown</div>
            <div style={{ marginTop: 8 }}>
              {[
                ["Overall", SLEEP.scores.overall],
                ["Quality", SLEEP.scores.quality],
                ["Duration", SLEEP.scores.duration],
                ["Awake Time", SLEEP.scores.awakeTimeScore],
                ["Awakenings", SLEEP.scores.awakeningsCountScore],
                ["Interruptions", SLEEP.scores.interruptionsScore],
              ].map(([label, val]) => (
                <SleepScoreBar key={label} label={label} value={val} />
              ))}
            </div>
          </div>

          {/* ── HRV Summary ── */}
          <div className="card">
            <div className="card-label">HRV Summary</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
              <span className="big-num" style={{ fontSize: 40, color: "var(--accent)" }}>{weeklyAvg.toFixed(0)}</span>
              <span className="big-num-unit">ms weekly avg</span>
            </div>
            <div className="status-badge status-balanced">
              <div className="status-dot" />
              {HRV.summary.status}
            </div>

            {/* Baseline range bar */}
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 9.5, color: "#4a5060", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                Baseline Range vs Last Night
              </div>
              <div className="hrv-range-bar">
                <div
                  className="hrv-range-fill"
                  style={{
                    left: `${(baselineLow / HRV_MAX) * 100}%`,
                    width: `${((baselineUpper - baselineLow) / HRV_MAX) * 100}%`,
                    opacity: 0.4
                  }}
                />
                {/* weekly avg marker */}
                <div className="hrv-marker" style={{
                  left: `${(weeklyAvg / HRV_MAX) * 100}%`,
                  background: "var(--accent2)"
                }} />
                {/* last night marker */}
                <div className="hrv-marker" style={{
                  left: `${(lastNight / HRV_MAX) * 100}%`,
                  background: "var(--accent)"
                }} />
              </div>
              <div className="hrv-axis">
                <span>0</span>
                <span style={{ color: "var(--accent2)" }}>▲ {weeklyAvg}ms weekly</span>
                <span style={{ color: "var(--accent)" }}>▲ {lastNight}ms last night</span>
                <span>{HRV_MAX}</span>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              {[
                ["Baseline Low", baselineLow + " ms"],
                ["Baseline Upper", baselineUpper + " ms"],
                ["Last Night 5-min High", HRV.summary.lastNight5minHigh.toFixed(0) + " ms"],
              ].map(([k, v]) => (
                <div className="stat-row" key={k}>
                  <div className="stat-key">{k}</div>
                  <div className="stat-val" style={{ fontSize: 13 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Charts ── */}
        <div className="section-divider">Overnight Trends</div>

        <div className="tab-row">
          {[["hrv", "HRV / Hour"], ["temp", "Skin Temp"]].map(([k, label]) => (
            <button
              key={k}
              className={`tab-btn${chartView === k ? " active" : ""}`}
              onClick={() => setChartView(k)}
            >
              {label}
            </button>
          ))}
        </div>

        {chartView === "hrv" && (
          <div className="card">
            <div className="card-label">HRV — Hourly Mean (ms) · Sleep Period 02:59–10:49 UTC</div>
            <div className="chart-wrap-tall">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={HRV.hourly} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hrv-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7fd9c4" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#7fd9c4" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#242830" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: "#4a5060", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4a5060", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} domain={[0, 130]} />
                  <Tooltip content={<CustomTooltip unit=" ms" />} />
                  <ReferenceLine y={HRV.summary.weeklyAverage} stroke="#f0a868" strokeDasharray="4 3" strokeWidth={1} label={{ value: "wkly avg", fill: "#f0a868", fontSize: 9, fontFamily: "DM Mono" }} />
                  <ReferenceLine y={baselineLow} stroke="#242830" strokeDasharray="2 4" strokeWidth={1} />
                  <ReferenceLine y={baselineUpper} stroke="#242830" strokeDasharray="2 4" strokeWidth={1} label={{ value: "baseline", fill: "#4a5060", fontSize: 9, fontFamily: "DM Mono" }} />
                  <Area type="monotone" dataKey="max" stroke="none" fill="none" name="max" dot={false} />
                  <Area type="monotone" dataKey="mean" stroke="#7fd9c4" strokeWidth={2} fill="url(#hrv-grad)" dot={{ fill: "#7fd9c4", r: 3, strokeWidth: 0 }} name="mean" />
                  <Area type="monotone" dataKey="min" stroke="none" fill="none" name="min" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="inline-note">
              Notable dip at 04:00 (mean 35.5ms) — consistent with deep sleep / lowest arousal phase. Recovery to 100+ ms by 08:00–10:00 suggests quality wake transition.
            </div>
          </div>
        )}

        {chartView === "temp" && (
          <div className="card">
            <div className="card-label">Skin Temp — Hourly Mean Offset from Baseline (°C) · 19:00 May 29 – 11:00 May 30</div>
            <div className="chart-wrap-tall">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={SKIN_TEMP.hourly} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="temp-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c97aff" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#c97aff" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#242830" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: "#4a5060", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4a5060", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip unit="°C" />} />
                  <ReferenceLine y={0} stroke="#4a5060" strokeWidth={1} />
                  <Area type="monotone" dataKey="mean" stroke="#c97aff" strokeWidth={2} fill="url(#temp-grad)" dot={{ fill: "#c97aff", r: 2.5, strokeWidth: 0 }} name="offset" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="inline-note">
              Sharp drop at 01:00 (−5.24°C mean, min −8.62°C) aligns with deepest sleep. Avg skin temp 35.53°C · Baseline offset +0.14°C · Acclimation 5.6%.
              98% of readings below baseline — normal for overnight thermoregulation.
            </div>
          </div>
        )}

        {/* ── File manifest ── */}
        <div className="section-divider" style={{ marginTop: 24 }}>Source Files</div>
        <div className="card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            {[
              ["SLEEP_DATA", "Sleep scores, BBI, assessment"],
              ["HRV_STATUS", "HRV values + summary (90 samples)"],
              ["SKIN_TEMP", "941 skin temp readings"],
              ["SLEEP_DISRUPTIONS", "Sleep start/end window"],
              ["WELLNESS ×5", "Monitoring, step/HR records"],
              ["METRICS ×2", "Manufacturer-specific daily stats"],
            ].map(([name, desc]) => (
              <div className="stat-row" key={name}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.08em", fontWeight: 500 }}>{name}</div>
                  <div style={{ fontSize: 9.5, color: "var(--muted)" }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
