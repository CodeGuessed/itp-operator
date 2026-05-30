import React, { useMemo } from 'react'
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { PHASES, CYCLE_STARTS, PROGRAM_START } from '../lib/program.js'
import { storage } from '../lib/storage.js'

// Obsidian Terminal palette for charts
const C = {
  teal:   '#00e5b0',
  amber:  '#ffaa44',
  violet: '#cc88ff',
  red:    '#ff5f6d',
  grid:   '#242830',
  muted:  '#4a5060',
}
const AX = { fill: C.muted, fontSize: 9, fontFamily: 'DM Mono, monospace' }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#181b22',
      border: '1px solid #242830',
      borderRadius: 6,
      padding: '7px 11px',
      fontSize: 11,
      fontFamily: 'DM Mono, monospace',
      fontVariantLigatures: 'none',
    }}>
      <div style={{ color: C.muted, marginBottom: 4, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#e8e4dc', marginBottom: 1 }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : (p.value ?? '—')}</strong>
        </div>
      ))}
    </div>
  )
}

function ProgramTimeline({ programPosition }) {
  const totalDays = (new Date('2027-03-15') - PROGRAM_START) / 86400000
  const elapsedDays = (new Date() - PROGRAM_START) / 86400000
  const pct = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100))

  // Phase break percentages
  const phase1End = (new Date('2026-09-29') - PROGRAM_START) / 86400000 / totalDays * 100
  const phase2End = (new Date('2027-02-02') - PROGRAM_START) / 86400000 / totalDays * 100

  return (
    <div className="program-timeline">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text2)' }}>Program Timeline</span>
        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>
          C{programPosition.cycle} W{programPosition.week} · {programPosition.phase}
        </span>
      </div>
      <div className="timeline-bar">
        <div className="timeline-fill" style={{ width: `${pct}%` }} />
        {[phase1End, phase2End].map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: `${p}%`, top: 0, bottom: 0, borderLeft: '1px solid var(--border)' }} />
        ))}
        <div className="timeline-marker" style={{ left: `${pct}%` }} />
      </div>
      <div style={{ display: 'flex', fontSize: '0.6rem', color: 'var(--text2)', marginTop: 4 }}>
        <span style={{ width: `${phase1End}%` }}>BUILD</span>
        <span style={{ width: `${phase2End - phase1End}%`, textAlign: 'center' }}>LEAN</span>
        <span style={{ flex: 1, textAlign: 'right' }}>POLISH</span>
      </div>
    </div>
  )
}

// Build 8 weeks of aggregated data from raw storage
function useWeeklyChartData() {
  return useMemo(() => {
    const checkins = storage.getDailyCheckins()
    const weeklies = storage.getWeeklyReviews()

    const weeks = []
    const now = new Date()
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      // Sunday of that week
      const sun = new Date(d)
      sun.setDate(sun.getDate() - sun.getDay())
      sun.setHours(0, 0, 0, 0)
      const sat = new Date(sun)
      sat.setDate(sat.getDate() + 7)

      const sunStr = sun.toISOString().slice(0, 10)
      const satStr = sat.toISOString().slice(0, 10)

      const weekCheckins = checkins.filter(c => c.date >= sunStr && c.date < satStr)
      const weeklyReview = weeklies.find(w => w.weekKey === sunStr)

      // HRV midpoints
      const hrvPts = weekCheckins.map(c => ({ '<55': 52, '55-65': 60, '65-75': 70, '75+': 78 }[c.hrv])).filter(Boolean)
      const avgHrv = hrvPts.length ? hrvPts.reduce((a, b) => a + b, 0) / hrvPts.length : null

      // Sleep midpoints
      const sleepPts = weekCheckins.map(c => ({ '<5h': 4.5, '5-6h': 5.5, '6-7h': 6.5, '7h+': 7.5 }[c.sleep])).filter(Boolean)
      const avgSleep = sleepPts.length ? sleepPts.reduce((a, b) => a + b, 0) / sleepPts.length : null

      const adherence = weeklyReview?.sessionsCompleted != null
        ? Math.round((weeklyReview.sessionsCompleted / 3) * 100) : null

      const label = sun.toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' })
      weeks.push({
        week: label,
        hrv:       avgHrv   != null ? +avgHrv.toFixed(1) : null,
        sleep:     avgSleep  != null ? +avgSleep.toFixed(1) : null,
        weight:    weeklyReview?.weight ? +parseFloat(weeklyReview.weight).toFixed(1) : null,
        adherence,
      })
    }
    return weeks
  }, [])
}

export default function Trends({ appState }) {
  const { programPosition } = appState
  const data = useWeeklyChartData()

  return (
    <div>
      <ProgramTimeline programPosition={programPosition} />

      {/* HRV */}
      <div className="chart-container">
        <div className="chart-title">HRV — Weekly Average (ms)</div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="hrvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.teal} stopOpacity={0.22} />
                <stop offset="95%" stopColor={C.teal} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
            <XAxis dataKey="week" tick={AX} axisLine={false} tickLine={false} />
            <YAxis domain={[40, 90]} tick={AX} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={55} stroke={C.red}   strokeDasharray="4 3" strokeWidth={1} />
            <ReferenceLine y={65} stroke={C.amber} strokeDasharray="4 3" strokeWidth={1} />
            <Area type="monotone" dataKey="hrv" name="HRV" stroke={C.teal} fill="url(#hrvGrad)" strokeWidth={2} connectNulls dot={{ fill: C.teal, r: 3, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Sleep */}
      <div className="chart-container">
        <div className="chart-title">Sleep Duration — Weekly Average (hrs)</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
            <XAxis dataKey="week" tick={AX} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 10]} tick={AX} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={7} stroke={C.teal} strokeDasharray="4 3" strokeWidth={1} label={{ value: '7h', fill: C.teal, fontSize: 9, fontFamily: 'DM Mono, monospace' }} />
            <Bar dataKey="sleep" name="Sleep (hrs)" fill={C.violet} opacity={0.65} radius={2} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weight */}
      <div className="chart-container">
        <div className="chart-title">Weight Trajectory (kg)</div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="wgtGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.amber} stopOpacity={0.18} />
                <stop offset="95%" stopColor={C.amber} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
            <XAxis dataKey="week" tick={AX} axisLine={false} tickLine={false} />
            <YAxis tick={AX} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke={C.amber} strokeWidth={2} connectNulls dot={{ fill: C.amber, r: 3, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Adherence */}
      <div className="chart-container">
        <div className="chart-title">Session Adherence (%)</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
            <XAxis dataKey="week" tick={AX} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={AX} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={100} stroke={C.teal} strokeDasharray="4 3" strokeWidth={1} />
            <Bar dataKey="adherence" name="Adherence %" fill={C.teal} opacity={0.6} radius={2} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
