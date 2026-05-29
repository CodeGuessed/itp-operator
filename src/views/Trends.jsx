import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { getLast8Weeks, getSundayReviewWeekStart } from '../lib/program.js';
import { getDailyLog, getWeeklyLog, getAllDailyLogs } from '../lib/storage.js';

const CHART_COLORS = {
  stroke: '#6366f1',
  fill: 'rgba(99,102,241,0.15)',
  grid: '#2a2a3a',
  text: '#8888aa',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      padding: '8px 10px',
      fontSize: '0.75rem',
      fontFamily: 'Space Mono, monospace',
    }}>
      <div style={{ color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--text)' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  );
}

function ChartSection({ title, children }) {
  return (
    <div className="chart-container">
      <div className="chart-title">{title}</div>
      {children}
    </div>
  );
}

function ProgramTimeline({ programPosition }) {
  const progress = Math.min(100, ((programPosition.week - 1) / 42) * 100);
  const phase1 = (14 / 42) * 100;
  const phase2 = (28 / 42) * 100;

  return (
    <div className="program-timeline">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text2)' }}>
          Program Timeline
        </span>
        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>
          Wk {programPosition.week}/42
        </span>
      </div>

      <div className="timeline-bar">
        <div className="timeline-fill" style={{ width: `${progress}%` }} />
        {/* Phase markers */}
        <div style={{
          position: 'absolute',
          left: `${phase1}%`,
          top: 0,
          bottom: 0,
          borderLeft: '1px solid var(--border)',
        }} />
        <div style={{
          position: 'absolute',
          left: `${phase2}%`,
          top: 0,
          bottom: 0,
          borderLeft: '1px solid var(--border)',
        }} />
        <div className="timeline-marker" style={{ left: `${progress}%` }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: '0.6rem', color: 'var(--text2)', width: `${phase1}%` }}>P1</span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text2)', width: `${phase2 - phase1}%`, textAlign: 'center' }}>P2</span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text2)', textAlign: 'right', flex: 1 }}>P3</span>
      </div>

      <div style={{ marginTop: 8, fontSize: '0.75rem' }}>
        <span style={{ color: 'var(--text2)' }}>{programPosition.phaseLabel || programPosition.phase}</span>
        {programPosition.isDeload && (
          <span className="flag-chip" style={{ marginLeft: 8, borderColor: 'var(--blue)', color: 'var(--blue)' }}>
            DELOAD
          </span>
        )}
      </div>
    </div>
  );
}

function useWeeklyChartData() {
  return useMemo(() => {
    const weeks = getLast8Weeks();
    const allDaily = getAllDailyLogs();

    return weeks.map(({ weekStart, position }) => {
      const weekStartDate = new Date(weekStart);
      const weekEndDate = new Date(weekStart);
      weekEndDate.setDate(weekEndDate.getDate() + 7);

      // Gather daily logs for this week
      const weekLogs = allDaily.filter((l) => {
        const d = new Date(l.date);
        return d >= weekStartDate && d < weekEndDate;
      });

      // HRV average (convert bucket to midpoint)
      const hrvMidpoints = weekLogs
        .map((l) => {
          if (l.hrv === '<55') return 52;
          if (l.hrv === '55-65') return 60;
          if (l.hrv === '65-75') return 70;
          if (l.hrv === '75+') return 78;
          return null;
        })
        .filter(Boolean);
      const avgHrv = hrvMidpoints.length
        ? hrvMidpoints.reduce((a, b) => a + b, 0) / hrvMidpoints.length
        : null;

      // Sleep average
      const sleepMidpoints = weekLogs
        .map((l) => {
          if (l.sleep === '<5h') return 4.5;
          if (l.sleep === '5-6h') return 5.5;
          if (l.sleep === '6-7h') return 6.5;
          if (l.sleep === '7h+') return 7.5;
          return null;
        })
        .filter(Boolean);
      const avgSleep = sleepMidpoints.length
        ? sleepMidpoints.reduce((a, b) => a + b, 0) / sleepMidpoints.length
        : null;

      // Weekly log
      const weekLog = getWeeklyLog(weekStartDate);

      // Adherence: sessions logged / 3
      const adherence = weekLog?.sessions != null ? Math.round((weekLog.sessions / 3) * 100) : null;

      const label = weekStartDate.toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' });

      return {
        week: label,
        hrv: avgHrv ? parseFloat(avgHrv.toFixed(1)) : null,
        sleep: avgSleep ? parseFloat(avgSleep.toFixed(1)) : null,
        weight: weekLog?.weight ? parseFloat(weekLog.weight) : null,
        adherence,
        position,
      };
    });
  }, []);
}

export default function Trends({ appState }) {
  const { programPosition } = appState;
  const data = useWeeklyChartData();

  const axisStyle = { fill: CHART_COLORS.text, fontSize: 10, fontFamily: 'Space Mono, monospace' };

  return (
    <div>
      <ProgramTimeline programPosition={programPosition} />

      <ChartSection title="HRV — Weekly Average (bpm)">
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="week" tick={axisStyle} />
            <YAxis domain={[40, 90]} tick={axisStyle} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={55} stroke={CHART_COLORS.red} strokeDasharray="3 3" strokeWidth={1} />
            <ReferenceLine y={65} stroke={CHART_COLORS.yellow} strokeDasharray="3 3" strokeWidth={1} />
            <Area
              type="monotone"
              dataKey="hrv"
              name="HRV"
              stroke={CHART_COLORS.stroke}
              fill={CHART_COLORS.fill}
              strokeWidth={2}
              connectNulls
              dot={{ fill: CHART_COLORS.stroke, r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection title="Sleep Duration — Weekly Average (hrs)">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="week" tick={axisStyle} />
            <YAxis domain={[0, 10]} tick={axisStyle} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={7} stroke={CHART_COLORS.green} strokeDasharray="3 3" strokeWidth={1.5} label={{ value: '7h', fill: CHART_COLORS.green, fontSize: 10 }} />
            <Bar
              dataKey="sleep"
              name="Sleep"
              fill={CHART_COLORS.stroke}
              opacity={0.8}
              radius={0}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection title="Weight Trajectory (kg)">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="week" tick={axisStyle} />
            <YAxis tick={axisStyle} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="weight"
              name="Weight"
              stroke={CHART_COLORS.stroke}
              strokeWidth={2}
              connectNulls
              dot={{ fill: CHART_COLORS.stroke, r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection title="Session Adherence (%)">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="week" tick={axisStyle} />
            <YAxis domain={[0, 100]} tick={axisStyle} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={100} stroke={CHART_COLORS.green} strokeDasharray="3 3" strokeWidth={1} />
            <Bar
              dataKey="adherence"
              name="Adherence %"
              fill={CHART_COLORS.green}
              opacity={0.7}
              radius={0}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>
    </div>
  );
}
