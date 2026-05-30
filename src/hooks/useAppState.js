// hooks/useAppState.js
import { useState, useCallback } from 'react'
import { storage } from '../lib/storage.js'
import { parseICS } from '../lib/ics.js'
import { getProgramPosition, getShiftType, parseShiftFromEvent } from '../lib/program.js'

// Keep imported shifts within a sensible window so localStorage stays small
const WINDOW_PAST_DAYS = 30
const WINDOW_FUTURE_DAYS = 150

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
    const winStart = now - WINDOW_PAST_DAYS * 86400000
    const winEnd = now + WINDOW_FUTURE_DAYS * 86400000

    // Keep only shift-bearing events within the window
    const relevant = all.filter((e) => {
      if (!parseShiftFromEvent(e.summary)) return false
      const ds = e.start?.dateTime || e.start?.date
      if (!ds) return false
      const t = new Date(ds).getTime()
      return !Number.isNaN(t) && t >= winStart && t <= winEnd
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
