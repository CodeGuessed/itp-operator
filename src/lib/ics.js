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
