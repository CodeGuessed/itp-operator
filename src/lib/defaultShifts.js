// lib/defaultShifts.js — the work shift schedule, embedded in code.
//
// Source of truth: ICS v6.9 (the program calendar). Shifts are derived from the
// shift-context training sessions it schedules (Night/Day/C-Shift pre-sessions),
// so this work calendar is guaranteed consistent with the program. Explicit
// dates across the whole 42-week program — no recurring rule, no OT days.
// Cycle 1 = 7 Night + 7 Day + 7 C-shift = 21 shifts.

import { buildShiftEvent } from './shiftCodes.js'

export const WORK_SHIFTS = [
  ['2026-05-27','NIGHT'],['2026-05-28','NIGHT'],
  ['2026-06-02','DAY'],['2026-06-03','DAY'],['2026-06-04','DAY'],
  ['2026-06-06','CSHIFT'],['2026-06-07','CSHIFT'],
  ['2026-06-12','NIGHT'],['2026-06-13','NIGHT'],['2026-06-14','NIGHT'],
  ['2026-06-19','DAY'],['2026-06-20','DAY'],['2026-06-21','DAY'],['2026-06-22','DAY'],
  ['2026-06-29','CSHIFT'],['2026-06-30','CSHIFT'],['2026-07-01','CSHIFT'],['2026-07-02','CSHIFT'],['2026-07-03','CSHIFT'],
  ['2026-07-06','NIGHT'],['2026-07-07','NIGHT'],
  ['2026-07-20','DAY'],['2026-07-21','DAY'],['2026-07-22','DAY'],
  ['2026-07-27','NIGHT'],['2026-07-28','NIGHT'],
  ['2026-08-03','CSHIFT'],['2026-08-04','CSHIFT'],['2026-08-05','CSHIFT'],
  ['2026-08-17','NIGHT'],['2026-08-18','NIGHT'],['2026-08-19','NIGHT'],
  ['2026-08-24','CSHIFT'],['2026-08-25','CSHIFT'],['2026-08-26','CSHIFT'],
  ['2026-09-07','DAY'],['2026-09-08','DAY'],['2026-09-09','DAY'],
  ['2026-09-14','NIGHT'],['2026-09-15','NIGHT'],['2026-09-16','NIGHT'],
  ['2026-09-21','CSHIFT'],['2026-09-22','CSHIFT'],['2026-09-23','CSHIFT'],
  ['2026-10-05','DAY'],['2026-10-06','DAY'],['2026-10-07','DAY'],
  ['2026-10-12','NIGHT'],['2026-10-13','NIGHT'],['2026-10-14','NIGHT'],
  ['2026-10-19','CSHIFT'],['2026-10-20','CSHIFT'],['2026-10-21','CSHIFT'],
  ['2026-10-26','DAY'],['2026-10-27','DAY'],['2026-10-28','DAY'],
  ['2026-11-09','NIGHT'],['2026-11-10','NIGHT'],['2026-11-11','NIGHT'],
  ['2026-11-16','CSHIFT'],['2026-11-17','CSHIFT'],['2026-11-18','CSHIFT'],
  ['2026-11-23','DAY'],['2026-11-24','DAY'],['2026-11-25','DAY'],
  ['2026-11-30','NIGHT'],['2026-12-01','NIGHT'],['2026-12-02','NIGHT'],
  ['2026-12-21','CSHIFT'],['2026-12-22','CSHIFT'],['2026-12-23','CSHIFT'],
  ['2026-12-28','NIGHT'],['2026-12-29','NIGHT'],['2026-12-30','NIGHT'],
  ['2027-01-11','DAY'],['2027-01-12','DAY'],['2027-01-13','DAY'],
  ['2027-01-18','NIGHT'],['2027-01-19','NIGHT'],['2027-01-20','NIGHT'],
  ['2027-01-25','CSHIFT'],['2027-01-26','CSHIFT'],['2027-01-27','CSHIFT'],
  ['2027-02-01','DAY'],['2027-02-02','DAY'],['2027-02-03','DAY'],
]

// Build concrete shift events covering [winStartISO, winEndISO].
export function buildDefaultShiftEvents(winStartISO, winEndISO) {
  const out = []
  for (const [date, type] of WORK_SHIFTS) {
    if (date < winStartISO || date > winEndISO) continue
    const ev = buildShiftEvent(date, type, 'default')
    if (ev) out.push(ev)
  }
  return out
}
