// lib/shiftCodes.js — shift-type definitions + event builders (single source of truth)

// 12-hour scheduled shift times (arrive 30 min prior). [OT] time varies → all-day.
export const SHIFT_DEFS = {
  NIGHT:  { key: 'NIGHT',  label: 'Night',  code: '[N] Night shift',  short: 'N',   color: 'violet', start: '18:00', end: '06:00', nextDay: true  },
  DAY:    { key: 'DAY',    label: 'Day',    code: '[D] Day shift',    short: 'D',   color: 'amber',  start: '06:00', end: '18:00', nextDay: false },
  CSHIFT: { key: 'CSHIFT', label: 'C-Shift',code: '[C] C-shift',      short: 'C',   color: 'teal',   start: '11:00', end: '23:00', nextDay: false },
  OT:     { key: 'OT',     label: 'OT',     code: '[OT] Overtime',    short: 'OT',  color: 'red',    allday: true },
  DIVE:   { key: 'DIVE',   label: 'Dive',   code: 'Dive Day',         short: 'DV',  color: 'blue',   allday: true },
  OFF:    { key: 'OFF',    label: 'Off',    code: null,               short: '·',   color: 'muted' },
}

// CSS colour var for a shift type
export function shiftColorVar(type) {
  return `var(--${SHIFT_DEFS[type]?.color || 'muted'})`
}

export function addDaysISO(iso, n) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// Build a concrete calendar event object for a given date + shift type.
// Returns null for OFF (no event). source marks origin ('default' | 'manual').
export function buildShiftEvent(dateISO, type, source = 'manual') {
  const def = SHIFT_DEFS[type]
  if (!def || type === 'OFF' || !def.code) return null

  if (def.allday) {
    return {
      summary: def.code,
      start: { date: dateISO },
      end:   { date: addDaysISO(dateISO, 1) },
      source,
    }
  }

  const endDate = def.nextDay ? addDaysISO(dateISO, 1) : dateISO
  return {
    summary: def.code,
    start: { dateTime: `${dateISO}T${def.start}:00` },
    end:   { dateTime: `${endDate}T${def.end}:00` },
    source,
  }
}

// Date helpers for the calendar grid
export function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

export function monthMatrix(year, month /* 0-indexed */) {
  const first = new Date(Date.UTC(year, month, 1))
  const startDow = first.getUTCDay() // 0=Sun
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const cells = []
  // Leading blanks
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(Date.UTC(year, month, d)).toISOString().slice(0, 10))
  }
  // Trailing blanks to complete the last row
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}
