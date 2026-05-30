import React, { useState } from 'react'
import { getShiftType } from '../lib/program.js'
import { SHIFT_DEFS, shiftColorVar, monthMatrix, isoToday } from '../lib/shiftCodes.js'

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const EDIT_TYPES = ['NIGHT', 'DAY', 'CSHIFT', 'OT', 'DIVE', 'OFF']

function rgbaFor(type, alpha) {
  // Map to the neon palette as rgba for tinted backgrounds
  const map = {
    NIGHT:  `rgba(204,136,255,${alpha})`,
    DAY:    `rgba(255,170,68,${alpha})`,
    CSHIFT: `rgba(0,229,176,${alpha})`,
    OT:     `rgba(255,95,109,${alpha})`,
    DIVE:   `rgba(85,170,255,${alpha})`,
    OFF:    'transparent',
  }
  return map[type] || 'transparent'
}

export default function ShiftCalendar({ shiftEvents, onSet, onClose, todayISO = isoToday() }) {
  const start = new Date(todayISO + 'T00:00:00Z')
  const [year, setYear] = useState(start.getUTCFullYear())
  const [month, setMonth] = useState(start.getUTCMonth())
  const [selected, setSelected] = useState(null) // date ISO being edited

  const cells = monthMatrix(year, month)

  function shiftYearMonth(delta) {
    let m = month + delta
    let y = year
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setMonth(m); setYear(y); setSelected(null)
  }

  function dayInfo(dateISO) {
    const r = getShiftType(shiftEvents, dateISO)
    // If OT flagged but no base shift, show OT
    if (r.type === 'OFF' && r.isOT) return { type: 'OT', isOT: true }
    return { type: r.type, isOT: r.isOT }
  }

  function pick(type) {
    if (selected) { onSet(selected, type); setSelected(null) }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <button style={navBtn} onClick={() => shiftYearMonth(-1)}>‹</button>
          <div style={{ flex: 1, textAlign: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em' }}>
            {MONTHS[month]} {year}
          </div>
          <button style={navBtn} onClick={() => shiftYearMonth(1)}>›</button>
          <button style={{ ...navBtn, marginLeft: 6, color: 'var(--muted)' }} onClick={onClose}>✕</button>
        </div>

        {/* Day-of-week header */}
        <div style={grid}>
          {DOW.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 0' }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={grid}>
          {cells.map((dateISO, i) => {
            if (!dateISO) return <div key={i} />
            const day = Number(dateISO.slice(8, 10))
            const { type, isOT } = dayInfo(dateISO)
            const def = SHIFT_DEFS[type] || SHIFT_DEFS.OFF
            const isToday = dateISO === todayISO
            const isSel = dateISO === selected
            return (
              <button
                key={i}
                onClick={() => setSelected(isSel ? null : dateISO)}
                style={{
                  ...cell,
                  background: isSel ? 'var(--surface2)' : rgbaFor(type, 0.14),
                  borderColor: isSel ? 'var(--violet)' : isToday ? 'var(--text2)' : 'var(--border)',
                }}
              >
                <span style={{ fontSize: 11, color: isToday ? 'var(--text)' : 'var(--text2)', fontWeight: isToday ? 700 : 400 }}>{day}</span>
                {type !== 'OFF' && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: shiftColorVar(type), letterSpacing: '0.02em' }}>
                    {def.short}{isOT && type !== 'OT' ? '+' : ''}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Editor */}
        {selected ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
              Set shift · {selected}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {EDIT_TYPES.map((t) => {
                const def = SHIFT_DEFS[t]
                return (
                  <button
                    key={t}
                    className="btn"
                    style={{ minHeight: 40, borderColor: shiftColorVar(t), color: shiftColorVar(t), fontSize: 11 }}
                    onClick={() => pick(t)}
                  >
                    {def.label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 12, fontSize: 10, color: 'var(--muted)', textAlign: 'center', letterSpacing: '0.04em' }}>
            Tap a day to add, change, or remove a shift
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14, justifyContent: 'center' }}>
          {['NIGHT','DAY','CSHIFT','OT','DIVE'].map((t) => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--text2)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: shiftColorVar(t) }} />
              {SHIFT_DEFS[t].label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

const overlay = {
  position: 'fixed', inset: 0, zIndex: 200,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
}
const sheet = {
  width: '100%', maxWidth: 480,
  background: 'var(--surface)',
  borderTop: '1px solid var(--border)',
  borderRadius: '14px 14px 0 0',
  padding: '18px 16px calc(20px + env(safe-area-inset-bottom, 0px))',
  maxHeight: '88vh', overflowY: 'auto',
}
const grid = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }
const cell = {
  aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: 1, border: '1px solid var(--border)', borderRadius: 6, background: 'transparent',
  cursor: 'pointer', padding: 0, fontFamily: 'DM Mono, monospace',
  WebkitTapHighlightColor: 'transparent',
}
const navBtn = {
  background: 'transparent', border: '1px solid var(--border)', borderRadius: 6,
  color: 'var(--text)', width: 34, height: 34, fontSize: 16, cursor: 'pointer',
}
