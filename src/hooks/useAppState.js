// hooks/useAppState.js
import { useState, useEffect, useCallback } from 'react'
import { storage } from '../lib/storage.js'
import {
  parseCodeFromUrl,
  exchangeCodeForToken,
  isTokenValid,
  fetchCalendarEvents,
  setCachedEvents,
  getCachedEvents,
} from '../lib/gcal.js'
import { getProgramPosition, getShiftType } from '../lib/program.js'

export function useAppState() {
  const [settings, setSettingsState] = useState(storage.getSettings)
  const [baselines, setBaselinesState] = useState(storage.getBaselines)
  const [todayCheckin, setTodayCheckin] = useState(storage.getTodayCheckin)
  const [gcalEvents, setGcalEvents] = useState([])
  const [gcalToken, setGcalTokenState] = useState(storage.getGCalToken)
  const [gcalLoading, setGcalLoading] = useState(false)
  const [gcalError, setGcalError] = useState(null)
  const [view, setView] = useState('today')

  const today = new Date().toISOString().slice(0, 10)
  const programPosition = getProgramPosition()

  // Handle GCal PKCE callback — code lands in ?code= query param
  useEffect(() => {
    const code = parseCodeFromUrl()
    if (!code) return

    const currentSettings = storage.getSettings()
    const clientId = currentSettings.gcalClientId
    if (!clientId) { setGcalError('Client ID missing — reconnect in Settings.'); return }

    setGcalLoading(true)
    exchangeCodeForToken(code, clientId)
      .then(token => {
        storage.saveGCalToken(token)
        setGcalTokenState(token)
        const s = { ...storage.getSettings(), gcalConnected: true }
        storage.saveSettings(s)
        setSettingsState(s)
      })
      .catch(e => setGcalError(`Auth failed: ${e.message}`))
      .finally(() => setGcalLoading(false))
  }, [])

  // Load GCal events when token changes or on mount
  useEffect(() => {
    const cached = getCachedEvents()
    if (cached?.length) { setGcalEvents(cached); return }
    if (gcalToken && isTokenValid(gcalToken)) { loadGcalEvents(gcalToken) }
  }, [gcalToken])

  const loadGcalEvents = useCallback(async (token) => {
    if (!token || !isTokenValid(token)) return
    setGcalLoading(true); setGcalError(null)
    try {
      const events = await fetchCalendarEvents(token.access_token)
      setCachedEvents(events)
      setGcalEvents(events)
    } catch (e) {
      setGcalError(e.message)
      if (e.message.includes('401')) { storage.clearGCalToken(); setGcalTokenState(null) }
    } finally { setGcalLoading(false) }
  }, [])

  const refreshGcal = useCallback(() => {
    if (gcalToken && isTokenValid(gcalToken)) loadGcalEvents(gcalToken)
  }, [gcalToken, loadGcalEvents])

  const todayShift = getShiftType(gcalEvents, today)
  const tomorrowShift = getShiftType(gcalEvents, new Date(Date.now() + 86400000).toISOString().slice(0, 10))

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
    gcalEvents, gcalLoading, gcalError, refreshGcal,
    gcalToken, setGcalTokenState,
    todayShift, tomorrowShift,
    programPosition,
    view, setView,
    today,
  }
}
