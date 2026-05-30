// hooks/useAppState.js
import { useState, useCallback } from 'react'
import { storage } from '../lib/storage.js'
import { parseICS, expandEvents } from '../lib/ics.js'
import { getProgramPosition, getShiftType, parseShiftFromEvent } from '../lib/program.js'
import { buildDefaultShiftEvents } from '../lib/defaultShifts.js'
import { buildShiftEvent } from '../lib/shiftCodes.js'

const WINDOW_PAST_DAYS = 30
const WINDOW_FUTURE_DAYS = 730

const isoOffset = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
const winStart = () => isoOffset(-WINDOW_PAST_DAYS)
const winEnd   = () => isoOffset(WINDOW_FUTURE_DAYS)

// Bump when the embedded default roster changes — forces a one-time refresh on
// existing devices (preserving manual edits). Source: ICS v6.9.
const SEED_VERSION = 'v6.9-rotation-2'

const evISO = (e) => (e.start?.dateTime || e.start?.date || '').slice(0, 10)

// Seed / migrate the embedded default roster (idempotent per SEED_VERSION).
function initShiftState() {
  const stored = storage.getShiftEvents()
  const events = stored.events || []

  if (stored.seedVersion === SEED_VERSION) {
    return { events, info: { count: stored.count ?? events.length, importedAt: stored.importedAt, lastFile: stored.lastFile } }
  }

  // (Re)seed defaults, preserving any manual single-day edits
  const defaults = buildDefaultShiftEvents(winStart(), winEnd())
  const manual = events.filter((e) => e.source === 'manual')
  const manualDates = new Set(manual.map(evISO))
  const merged = [...defaults.filter((d) => !manualDates.has(evISO(d))), ...manual]

  const meta = { seeded: true, seedVersion: SEED_VERSION, importedAt: Date.now(), lastFile: 'Built-in roster (ICS v6.9)' }
  storage.saveShiftEvents(merged, meta)
  return { events: merged, info: { count: merged.length, importedAt: meta.importedAt, lastFile: meta.lastFile } }
}

export function useAppState() {
  const [settings, setSettingsState] = useState(storage.getSettings)
  const [baselines, setBaselinesState] = useState(storage.getBaselines)
  const [todayCheckin, setTodayCheckin] = useState(storage.getTodayCheckin)

  const initial = initShiftState()
  const [shiftEvents, setShiftEvents] = useState(initial.events)
  const [importInfo, setImportInfo] = useState(initial.info)

  const [view, setView] = useState('today')

  const today = new Date().toISOString().slice(0, 10)
  const programPosition = getProgramPosition()

  function persist(events, meta = {}) {
    storage.saveShiftEvents(events, { seeded: true, ...meta })
    setShiftEvents(events)
    setImportInfo((i) => ({ ...i, count: events.length, ...meta }))
  }

  // ── ICS import ────────────────────────────────────────────────────────────
  const importIcs = useCallback((text, fileName = '') => {
    const all = parseICS(text)
    const ws = winStart(), we = winEnd()
    const expanded = expandEvents(all, ws, we)
    const relevant = expanded.filter((e) => {
      if (!parseShiftFromEvent(e.summary)) return false
      const ds = (e.start?.dateTime || e.start?.date || '').slice(0, 10)
      return ds && ds >= ws && ds <= we
    })

    const existing = storage.getShiftEvents().events || []
    const map = new Map()
    for (const e of [...existing, ...relevant]) {
      const key = `${e.summary}|${(e.start?.dateTime || e.start?.date || '').slice(0, 10)}`
      map.set(key, e)
    }
    const merged = [...map.values()]
    persist(merged, { importedAt: Date.now(), lastFile: fileName })
    return { scanned: all.length, added: relevant.length, total: merged.length }
  }, [])

  const clearShifts = useCallback(() => {
    storage.saveShiftEvents([], { seeded: true, seedVersion: SEED_VERSION, importedAt: null, lastFile: null })
    setShiftEvents([])
    setImportInfo({ count: 0, importedAt: null, lastFile: null })
  }, [])

  // Restore the embedded default roster (discards manual edits)
  const restoreDefaultShifts = useCallback(() => {
    const events = buildDefaultShiftEvents(winStart(), winEnd())
    persist(events, { seedVersion: SEED_VERSION, importedAt: Date.now(), lastFile: 'Built-in roster (ICS v6.9)' })
    return events.length
  }, [])

  // ── Manual edits — add / change / remove a single day ──────────────────────
  const setShiftForDate = useCallback((dateISO, type) => {
    const prev = storage.getShiftEvents().events || []
    // Drop existing shift-bearing events that START on this date
    const kept = prev.filter((e) => {
      const ds = (e.start?.dateTime || e.start?.date || '').slice(0, 10)
      if (ds !== dateISO) return true
      return !parseShiftFromEvent(e.summary)
    })
    const ev = buildShiftEvent(dateISO, type, 'manual')
    const next = ev ? [...kept, ev] : kept
    persist(next)
  }, [])

  const removeShiftForDate = useCallback((dateISO) => setShiftForDate(dateISO, 'OFF'), [setShiftForDate])

  // ── Shift detection ─────────────────────────────────────────────────────────
  const todayShift = getShiftType(shiftEvents, today)
  const tomorrowShift = getShiftType(shiftEvents, isoOffset(1))

  // ── Settings / baselines / check-ins ────────────────────────────────────────
  const saveSettings = useCallback((s) => { storage.saveSettings(s); setSettingsState(s) }, [])
  const saveBaselines = useCallback((b) => { storage.saveBaselines(b); setBaselinesState(b) }, [])

  const saveCheckin = useCallback((entry) => {
    const full = { ...entry, date: today, updatedAt: Date.now() }
    storage.saveDailyCheckin(full)
    setTodayCheckin(full)
  }, [today])

  return {
    settings, saveSettings,
    baselines, saveBaselines,
    todayCheckin, saveCheckin,
    todayShift, tomorrowShift,
    shiftEvents, importInfo,
    importIcs, clearShifts, restoreDefaultShifts,
    setShiftForDate, removeShiftForDate,
    programPosition,
    view, setView,
    today,
  }
}
