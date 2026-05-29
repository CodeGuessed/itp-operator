// lib/program.js — ITP v6.7 program logic

export const PROGRAM_START = new Date('2026-05-27')
export const PROGRAM_END = new Date('2027-03-15')

export const PHASES = [
  { name: 'BUILD', start: '2026-05-27', end: '2026-09-29', calories: 3100, protein: [180, 200], cycles: [1, 2, 3] },
  { name: 'LEAN',  start: '2026-09-30', end: '2027-02-02', calories: 2700, protein: [200, 210], cycles: [4, 5, 6] },
  { name: 'POLISH',start: '2027-02-03', end: '2027-03-15', calories: 3000, protein: [200, 210], cycles: [7] },
]

export const CYCLE_STARTS = {
  1: '2026-05-27', 2: '2026-07-08', 3: '2026-08-19',
  4: '2026-09-30', 5: '2026-11-11', 6: '2026-12-23',
  7: '2027-02-03',
}

export function getProgramPosition(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date
  const phase = PHASES.find(p => d >= new Date(p.start) && d <= new Date(p.end)) || PHASES[0]

  let cycle = 1, week = 1
  const entries = Object.entries(CYCLE_STARTS).sort((a, b) => new Date(a[1]) - new Date(b[1]))
  for (const [c, start] of entries) {
    if (d >= new Date(start)) { cycle = parseInt(c) }
  }
  const cycleStart = new Date(CYCLE_STARTS[cycle])
  const daysSince = Math.floor((d - cycleStart) / (1000 * 60 * 60 * 24))
  week = Math.min(6, Math.floor(daysSince / 7) + 1)

  return { phase: phase.name, cycle, week, calories: phase.calories, protein: phase.protein }
}

// GCal event title parsing — derived from actual calendar data
// Patterns observed: [N]D6, [D] D6, [OT] HAZMAT training, Dive Day, etc.
export function parseShiftFromEvent(summary = '') {
  const s = summary.toUpperCase()
  if (s.includes('[N]') || s.match(/NIGHT\s*(SHIFT)?/)) return 'NIGHT'
  if (s.includes('[D]') || s.match(/^DAY\s*(SHIFT)?/) || s.match(/\[D\]/)) return 'DAY'
  if (s.includes('[C]') || s.match(/C-?SHIFT/)) return 'CSHIFT'
  if (s.includes('DIVE') || s.match(/DIVE\s*(DAY)?/i)) return 'DIVE'
  if (s.includes('[OT]') || s.match(/OVERTIME|OT\s/)) return 'OT'
  return null
}

export function getShiftType(events = [], dateStr) {
  const date = dateStr || new Date().toISOString().slice(0, 10)
  const dayEvents = events.filter(e => {
    const start = (e.start?.dateTime || e.start?.date || '').slice(0, 10)
    const end = (e.end?.dateTime || e.end?.date || '').slice(0, 10)
    return start === date || end === date || (start < date && end > date)
  })

  // Check for dive day first (highest priority override)
  const diveEvent = dayEvents.find(e => parseShiftFromEvent(e.summary) === 'DIVE')
  if (diveEvent) return { type: 'DIVE', events: dayEvents }

  // Check for shift events - look at start date primarily
  for (const e of dayEvents) {
    const st = parseShiftFromEvent(e.summary)
    if (st && st !== 'OT') return { type: st, events: dayEvents }
  }
  return { type: 'OFF', events: dayEvents }
}

// Notification time by shift type (ISO time string HH:MM)
export function getNotificationTime(shiftType, overrides = {}) {
  const defaults = { DAY: '02:45', NIGHT: '14:00', CSHIFT: '07:30', OFF: '07:30', DIVE: '07:30' }
  return overrides[shiftType] || defaults[shiftType] || '07:30'
}

// Recovery decision engine
export function computePrescription({ hrv, sleep, rem, rhr, shiftType, otOccurred, diveDay, subjectiveFeel, baselines }) {
  // Dive day overrides everything
  if (diveDay) return {
    level: 'DIVE_PROTOCOL',
    label: 'Dive Day Protocol',
    color: '#3b82f6',
    sessions: ['No strength session', 'No CO₂ or O₂ table', 'Zone 1 walk post-dive only', 'Vyvanse: 10mg only (MD approved)'],
    rationale: 'Dive day active. All dry training cancelled.',
    flags: [],
  }

  // Count recovery flags
  const flags = []
  const bHRV = baselines?.hrv || 65
  const bRHR = baselines?.rhr || 46

  if (hrv === '<55') flags.push({ key: 'hrv', msg: 'HRV below action floor (55ms)' })
  else if (hrv === '55-65' && bHRV > 70) flags.push({ key: 'hrv_low', msg: 'HRV below personal baseline' })

  if (sleep === '<5h') flags.push({ key: 'sleep_critical', msg: 'Sleep critically low (<5hr)' })
  else if (sleep === '5-6h') flags.push({ key: 'sleep_low', msg: 'Sleep below 6hr target' })

  if (rem === '<60') flags.push({ key: 'rem', msg: 'REM below 60min cognitive floor' })
  if (rhr === '>51') flags.push({ key: 'rhr', msg: 'RHR elevated >5bpm above baseline' })

  // Post-night-shift logic
  const isPostNight = shiftType === 'NIGHT'
  if (isPostNight) flags.push({ key: 'post_night', msg: 'Post-night-shift window' })

  // OT adds recovery debt
  if (otOccurred) flags.push({ key: 'ot', msg: 'OT occurred — extend recovery 12hr' })

  const flagCount = flags.length
  const isCritical = flags.some(f => ['sleep_critical', 'hrv'].includes(f.key))
  const isPostNightNoSleep = isPostNight && (sleep === '<5h' || sleep === '5-6h')

  let level, label, color, sessions, rationale

  if (isPostNightNoSleep || (flagCount >= 3) || (isCritical && flagCount >= 2)) {
    level = 'REST'; label = 'Rest Day'; color = '#ef4444'
    sessions = ['Full rest — no training', 'No CO₂ table today', 'Short walk acceptable if feeling ok', 'Prioritize second sleep if post-night']
    rationale = flagCount >= 3 ? `${flagCount} recovery flags active — full rest indicated.` : 'Post-night insufficient sleep — no session until second sleep obtained.'
  } else if (flagCount >= 2 || (isPostNight && flagCount >= 1)) {
    level = 'ZONE2'; label = 'Zone 2 Only'; color = '#f59e0b'
    sessions = ['Zone 2 aerobic only: 20–30 min', '117–136 bpm target (Garmin-measured)', 'Incline walk or bike commute counts', 'No strength work', 'CO₂ table: only if not post-night']
    rationale = `${flagCount} recovery signal${flagCount > 1 ? 's' : ''} degraded — preserve capacity.`
  } else if (flagCount === 1 || shiftType === 'CSHIFT' || (shiftType === 'DAY' && otOccurred)) {
    level = 'SHORT'; label = 'Shortened Session'; color = '#eab308'
    sessions = ['Glute primer (5–7 min)', 'Warm-up (8 min)', 'Main lifts only (30 min cap)', 'Skip accessory and finisher', 'Decompression (5 min)']
    rationale = flagCount === 1 ? `One recovery flag: ${flags[0]?.msg}. Reduce load, keep structure.` : 'Shift context requires abbreviated session.'
  } else {
    level = 'FULL'; label = 'Full Session'; color = '#22c55e'
    sessions = ['Glute primer (5–7 min)', 'Warm-up (8 min)', 'Main lifts — target sets', 'Accessory work', 'Swing finisher', 'Pull-up work', 'Decompression (5 min)']
    rationale = 'Recovery signals clear. Full session indicated.'
  }

  // Body Battery suppression note
  const suppressBodyBattery = ['NIGHT', 'CSHIFT'].includes(shiftType)

  return { level, label, color, sessions, rationale, flags, suppressBodyBattery }
}

// Stall check decision tree
export function runStallCheck({ sleepAvg, proteinHit, diveCountWeek }) {
  if (sleepAvg < 6.5) return { cause: 'sleep', message: 'Sleep avg below 6.5hr — likely cause. Protect sleep first before adjusting load.' }
  if (proteinHit === 'Rarely') return { cause: 'protein', message: 'Protein target not met consistently — likely cause. Hit protein before deloading.' }
  if (diveCountWeek >= 5) return { cause: 'dives', message: `${diveCountWeek} dives this week — significant recovery cost. Reduce session intensity before deloading.` }
  return { cause: 'genuine', message: 'Sleep, protein, and dive load are adequate. Reduce to 3×6 for one week, then rebuild.' }
}

// Failure mode detector (runs on weekly data)
export function detectFailureModes(recentCheckins = [], recentWeeklies = []) {
  const modes = []
  if (recentCheckins.length < 3) return modes

  // OCD escalation
  const lastWeekly = recentWeeklies[recentWeeklies.length - 1]
  if (lastWeekly?.ocdMarkers?.filter(Boolean).length >= 2) {
    modes.push({ id: 'ocd', label: 'OCD escalation', severity: 'high', action: 'Weekly weigh-in only; pause Lean phase; clinician if >2 weeks' })
  }

  // Recovery debt trend
  const hvHRVdays = recentCheckins.filter(c => c.hrv === '<55' || c.hrv === '55-65').length
  if (hvHRVdays >= 4) {
    modes.push({ id: 'recovery_debt', label: 'Recovery debt accumulating', severity: 'high', action: 'Reduce to Zone 2 only; protect sleep window' })
  }

  // Sleep deterioration
  const poorSleepDays = recentCheckins.filter(c => c.sleep === '<5h' || c.sleep === '5-6h').length
  if (poorSleepDays >= 4) {
    modes.push({ id: 'sleep_debt', label: 'Sleep debt', severity: 'high', action: 'Sleep protection is the priority. No compensatory training.' })
  }

  return modes
}
