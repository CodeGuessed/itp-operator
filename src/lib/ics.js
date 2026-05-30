// lib/ics.js — minimal RFC5545 .ics parser (no dependencies)
//
// Returns a flat array of events shaped like the Google Calendar API so the
// existing getShiftType()/parseShiftFromEvent() logic works unchanged:
//   { summary, start: { date } | { dateTime }, end: {...}, uid, rrule }

function unescapeText(v) {
  return v
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim()
}

// "20260527" → { date: '2026-05-27' }
// "20181009T174500Z" → { dateTime: '2018-10-09T17:45:00Z' }
function parseDt(rawKey, value) {
  const dateOnly = /VALUE=DATE(?!-TIME)/i.test(rawKey) || /^\d{8}$/.test(value.trim())
  const v = value.trim()
  if (dateOnly) {
    return { date: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` }
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?/)
  if (!m) {
    // Fallback: treat first 8 chars as a date
    return { date: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` }
  }
  const [, y, mo, d, h, mi, s, z] = m
  return { dateTime: `${y}-${mo}-${d}T${h}:${mi}:${s}${z ? 'Z' : ''}` }
}

// Shift an ISO date (or datetime) by a whole number of days, preserving the
// time-of-day. Uses UTC date math so DST never shifts the calendar day.
function shiftIsoDays(iso, days) {
  if (!days) return iso
  const [d, t] = iso.split('T')
  const dt = new Date(d + 'T00:00:00Z')
  dt.setUTCDate(dt.getUTCDate() + days)
  const nd = dt.toISOString().slice(0, 10)
  return t ? `${nd}T${t}` : nd
}

// Expand a single (possibly recurring) event into concrete occurrences whose
// START date falls within [winStartISO, winEndISO]. Supports the common
// FREQ=WEEKLY / FREQ=DAILY rules with INTERVAL, COUNT and UNTIL — enough for a
// fixed shift rotation (e.g. "every 6 weeks" = WEEKLY;INTERVAL=6). Unsupported
// frequencies (MONTHLY/YEARLY) fall back to the single base occurrence.
export function expandEvent(ev, winStartISO, winEndISO, cap = 1000) {
  if (!ev.rrule) return [ev]

  const m = {}
  for (const part of ev.rrule.split(';')) {
    const [k, v] = part.split('=')
    if (k) m[k.toUpperCase()] = v
  }
  const freq = (m.FREQ || '').toUpperCase()
  const interval = parseInt(m.INTERVAL || '1', 10) || 1
  const stepDays = freq === 'WEEKLY' ? 7 * interval : freq === 'DAILY' ? interval : 0
  if (!stepDays) return [ev]

  const count = m.COUNT ? parseInt(m.COUNT, 10) : Infinity
  let untilISO = null
  if (m.UNTIL) {
    const u = m.UNTIL.replace(/[TZ].*$/, '')
    untilISO = `${u.slice(0, 4)}-${u.slice(4, 6)}-${u.slice(6, 8)}`
  }

  const startIso = ev.start.dateTime || ev.start.date
  const startKind = ev.start.dateTime ? 'dateTime' : 'date'
  const endIso = ev.end?.dateTime || ev.end?.date || null
  const endKind = ev.end?.dateTime ? 'dateTime' : ev.end?.date ? 'date' : null

  const out = []
  for (let k = 0; k < count && k < cap; k++) {
    const s = shiftIsoDays(startIso, k * stepDays)
    const sd = s.slice(0, 10)
    if (untilISO && sd > untilISO) break
    if (sd > winEndISO) break
    if (sd >= winStartISO) {
      const occ = { ...ev, start: { [startKind]: s } }
      if (endIso) occ.end = { [endKind]: shiftIsoDays(endIso, k * stepDays) }
      delete occ.rrule
      out.push(occ)
    }
  }
  return out
}

// Expand a list of events (recurring or not) over a window.
export function expandEvents(events, winStartISO, winEndISO) {
  return events.flatMap(e => expandEvent(e, winStartISO, winEndISO))
}

export function parseICS(text) {
  if (!text || typeof text !== 'string') return []

  // RFC5545 line unfolding: continuation lines start with space or tab
  const unfolded = text.replace(/\r?\n[ \t]/g, '')
  const lines = unfolded.split(/\r?\n/)

  const events = []
  let cur = null

  for (const line of lines) {
    const trimmed = line.trimEnd()
    if (trimmed === 'BEGIN:VEVENT') { cur = {}; continue }
    if (trimmed === 'END:VEVENT') {
      if (cur && cur.summary && cur.start) events.push(cur)
      cur = null
      continue
    }
    if (!cur) continue

    const idx = trimmed.indexOf(':')
    if (idx === -1) continue

    const rawKey = trimmed.slice(0, idx)        // e.g. "DTSTART;VALUE=DATE"
    const value = trimmed.slice(idx + 1)
    const key = rawKey.split(';')[0].toUpperCase()

    switch (key) {
      case 'SUMMARY':  cur.summary = unescapeText(value); break
      case 'DTSTART':  cur.start = parseDt(rawKey, value); break
      case 'DTEND':    cur.end = parseDt(rawKey, value); break
      case 'UID':      cur.uid = value; break
      case 'RRULE':    cur.rrule = value; break
      default: break
    }
  }

  return events
}
