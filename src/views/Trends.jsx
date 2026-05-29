import React, { useMemo } from 'react'
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { PHASES, CYCLE_STARTS, PROGRAM_START } from '../lib/program.js'
import { storage } from '../lib/storage.js'

const AX = { fill: '#8888aa', fontSize: 10, fontFamily: 'Space Mono, monospace' }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '8px 10px', fontSize: '0.75rem', fontFamily: 'Space Mono, monospace' }}>
      <div style={{ color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--text)' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value ?? '—'}
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

      <div className="chart-container">
        <div className="chart-title">HRV — Weekly Average (ms)</div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis dataKey="week" tick={AX} />
            <YAxis domain={[40, 90]} tick={AX} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={55} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
            <ReferenceLine y={65} stroke="#eab308" strokeDasharray="3 3" strokeWidth={1} />
            <Area type="monotone" dataKey="hrv" name="HRV" stroke="#6366f1" fill="rgba(99,102,241,0.15)" strokeWidth={2} connectNulls dot={{ fill: '#6366f1', r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <div className="chart-title">Sleep Duration — Weekly Average (hrs)</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis dataKey="week" tick={AX} />
            <YAxis domain={[0, 10]} tick={AX} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={7} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: '7h', fill: '#22c55e', fontSize: 10 }} />
            <Bar dataKey="sleep" name="Sleep" fill="#6366f1" opacity={0.8} radius={0} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <div className="chart-title">Weight Trajectory (kg)</div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis dataKey="week" tick={AX} />
            <YAxis tick={AX} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="weight" name="Weight" stroke="#6366f1" strokeWidth={2} connectNulls dot={{ fill: '#6366f1', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <div className="chart-title">Session Adherence (%)</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis dataKey="week" tick={AX} />
            <YAxis domain={[0, 100]} tick={AX} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1} />
            <Bar dataKey="adherence" name="Adherence %" fill="#22c55e" opacity={0.7} radius={0} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
