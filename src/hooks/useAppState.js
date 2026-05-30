// hooks/useAppState.js
import { useState, useCallback } from 'react'
import { storage } from '../lib/storage.js'
import { parseICS, expandEvents } from '../lib/ics.js'
import { getProgramPosition, getShiftType, parseShiftFromEvent } from '../lib/program.js'

// Expand recurring shifts this far ahead so a 6-week-repeating roster stays
// populated for years without re-importing. Sparse (~20 shifts / 42 days),
// so even +2 years is a few hundred small records.
const WINDOW_PAST_DAYS = 30
const WINDOW_FUTURE_DAYS = 730

export function useAppState() {
  const [settings, setSettingsState] = useState(storage.getSettings)
  const [baselines, setBaselinesState] = useState(storage.getBaselines)
  const [todayCheckin, setTodayCheckin] = useState(storage.getTodayCheckin)

  const [shiftEvents, setShiftEvents] = useState(() => storage.getShiftEvents().events)
  const [importInfo, setImportInfo] = useState(() => {
    const s = storage.getShiftEvents()
    return { count: s.count || 0, importedAt: s.importedAt, lastFile: s.lastFile }
  })

  const [view, setView] = useState('today')

  const today = new Date().toISOString().slice(0, 10)
  const programPosition = getProgramPosition()

  // ── ICS import ────────────────────────────────────────────────────────────
  const importIcs = useCallback((text, fileName = '') => {
    const all = parseICS(text)
    const now = Date.now()
    const winStartISO = new Date(now - WINDOW_PAST_DAYS * 86400000).toISOString().slice(0, 10)
    const winEndISO = new Date(now + WINDOW_FUTURE_DAYS * 86400000).toISOString().slice(0, 10)

    // Expand recurring rules into concrete occurrences across the window…
    const expanded = expandEvents(all, winStartISO, winEndISO)

    // …then keep only shift-bearing events inside the window
    const relevant = expanded.filter((e) => {
      if (!parseShiftFromEvent(e.summary)) return false
      const ds = (e.start?.dateTime || e.start?.date || '').slice(0, 10)
      return ds && ds >= winStartISO && ds <= winEndISO
    })

    // Merge with existing imports, dedupe by summary + start-date
    const existing = storage.getShiftEvents().events
    const map = new Map()
    for (const e of [...existing, ...relevant]) {
      const key = `${e.summary}|${(e.start?.dateTime || e.start?.date || '').slice(0, 10)}`
      map.set(key, e)
    }
    const merged = [...map.values()]

    storage.saveShiftEvents(merged, { lastFile: fileName })
    setShiftEvents(merged)
    setImportInfo({ count: merged.length, importedAt: Date.now(), lastFile: fileName })

    return { scanned: all.length, added: relevant.length, total: merged.length }
  }, [])

  const clearShifts = useCallback(() => {
    storage.clearShiftEvents()
    setShiftEvents([])
    setImportInfo({ count: 0, importedAt: null, lastFile: null })
  }, [])

  // ── Shift detection from imported events ────────────────────────────────────
  const todayShift = getShiftType(shiftEvents, today)
  const tomorrowShift = getShiftType(
    shiftEvents,
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  )

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
    shiftEvents, importInfo, importIcs, clearShifts,
    programPosition,
    view, setView,
    today,
  }
}
