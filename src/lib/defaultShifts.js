// lib/defaultShifts.js — the work shift rotation, embedded in code.
//
// A FIXED 6-week (42-day) rotation that repeats from May 27, 2026. This is the
// work calendar and is independent of the training program (which starts May 25
// with irregular week boundaries — see program.js).
//
// Cycle 1 pattern (confirmed against ICS v6.9): 7 Night + 7 Day + 7 C-shift = 21
// shifts. No OT days. Repeats every 42 days indefinitely.

import { buildShiftEvent, addDaysISO } from './shiftCodes.js'

const CYCLE_ANCHOR = '2026-05-27'   // rotation starts here; no shifts before this
const CYCLE_DAYS = 42

// Day offsets from each cycle anchor → shift type.
// 20 fixed shifts (7 Night + 7 Day + 6 C-shift) + 1 recurring [OT] (offset 35,
// time varies). [OT] is reflected as work but counted separately from the 20.
const PATTERN = [
  ...[0, 1, 16, 17, 18, 40, 41].map((off) => ({ off, type: 'NIGHT' })),
  ...[6, 7, 8, 23, 24, 25, 26].map((off) => ({ off, type: 'DAY' })),
  ...[10, 11, 33, 34, 36, 37].map((off) => ({ off, type: 'CSHIFT' })),
  { off: 35, type: 'OT' },
]

// One-time shifts that do NOT repeat (e.g. a single OT day)
const ONE_OFF = [
  { date: '2026-06-01', type: 'OT' },
]

function diffDays(aISO, bISO) {
  return Math.round((new Date(aISO + 'T00:00:00Z') - new Date(bISO + 'T00:00:00Z')) / 86400000)
}

// Build concrete shift events covering [winStartISO, winEndISO].
export function buildDefaultShiftEvents(winStartISO, winEndISO) {
  const out = []
  // Start one cycle before the window to be safe near boundaries
  let cycle = Math.floor(diffDays(winStartISO, CYCLE_ANCHOR) / CYCLE_DAYS) - 1

  for (; ; cycle++) {
    const cycleStart = addDaysISO(CYCLE_ANCHOR, cycle * CYCLE_DAYS)
    if (cycleStart > winEndISO) break
    for (const { off, type } of PATTERN) {
      const date = addDaysISO(cycleStart, off)
      // Rotation has no shifts before it begins (May 27, 2026)
      if (date < CYCLE_ANCHOR) continue
      if (date < winStartISO || date > winEndISO) continue
      const ev = buildShiftEvent(date, type, 'default')
      if (ev) out.push(ev)
    }
  }

  // One-time shifts within the window
  for (const { date, type } of ONE_OFF) {
    if (date < winStartISO || date > winEndISO) continue
    const ev = buildShiftEvent(date, type, 'default')
    if (ev) out.push(ev)
  }
  return out
}
