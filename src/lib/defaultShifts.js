// lib/defaultShifts.js — the work rotation, embedded in code (no file import needed)
//
// 6-week (42-day) cycle anchored to 2026-05-27, repeating indefinitely.
// 21 shifts/cycle: 7 Night, 7 Day, 6 C-shift, 1 recurring OT.
// Plus one one-time OT (2026-06-01).
// Source of truth confirmed against the user's roster.

import { buildShiftEvent, addDaysISO } from './shiftCodes.js'

const CYCLE_ANCHOR = '2026-05-27'
const CYCLE_DAYS = 42

// Day offsets from the cycle anchor → shift type (repeat every cycle)
const RECURRING = [
  // Night
  { off: 0,  type: 'NIGHT' }, { off: 1,  type: 'NIGHT' },
  { off: 16, type: 'NIGHT' }, { off: 17, type: 'NIGHT' }, { off: 18, type: 'NIGHT' },
  { off: 40, type: 'NIGHT' }, { off: 41, type: 'NIGHT' },
  // Day
  { off: 6,  type: 'DAY' },   { off: 7,  type: 'DAY' },   { off: 8,  type: 'DAY' },
  { off: 23, type: 'DAY' },   { off: 24, type: 'DAY' },   { off: 25, type: 'DAY' }, { off: 26, type: 'DAY' },
  // C-shift
  { off: 10, type: 'CSHIFT' },{ off: 11, type: 'CSHIFT' },
  { off: 33, type: 'CSHIFT' },{ off: 34, type: 'CSHIFT' },{ off: 36, type: 'CSHIFT' }, { off: 37, type: 'CSHIFT' },
  // Recurring OT
  { off: 35, type: 'OT' },
]

// One-time shifts (do not repeat)
const ONE_OFF = [
  { date: '2026-06-01', type: 'OT' },
]

function diffDays(aISO, bISO) {
  return Math.round((new Date(aISO + 'T00:00:00Z') - new Date(bISO + 'T00:00:00Z')) / 86400000)
}

// Build concrete shift events covering [winStartISO, winEndISO].
export function buildDefaultShiftEvents(winStartISO, winEndISO) {
  const out = []

  // Which cycle index covers winStart? (can be negative)
  const startOffset = diffDays(winStartISO, CYCLE_ANCHOR)
  let firstCycle = Math.floor(startOffset / CYCLE_DAYS)
  // step back one to be safe with cross-boundary night shifts
  firstCycle -= 1

  for (let c = firstCycle; ; c++) {
    const cycleStart = addDaysISO(CYCLE_ANCHOR, c * CYCLE_DAYS)
    if (cycleStart > winEndISO) break

    for (const { off, type } of RECURRING) {
      const date = addDaysISO(cycleStart, off)
      if (date < winStartISO || date > winEndISO) continue
      const ev = buildShiftEvent(date, type, 'default')
      if (ev) out.push(ev)
    }
  }

  // One-off shifts within window
  for (const { date, type } of ONE_OFF) {
    if (date >= winStartISO && date <= winEndISO) {
      const ev = buildShiftEvent(date, type, 'default')
      if (ev) out.push(ev)
    }
  }

  return out
}
