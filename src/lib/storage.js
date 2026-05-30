// lib/storage.js — localStorage interface with typed helpers

const KEYS = {
  SETTINGS: 'itp_settings',
  DAILY_CHECKINS: 'itp_daily_checkins',
  WEEKLY_REVIEWS: 'itp_weekly_reviews',
  BASELINES: 'itp_baselines',
  SHIFT_EVENTS: 'itp_shift_events',
}

const get = (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null } catch { return null } }
const set = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)) } catch (e) { console.error('Storage write failed', e) } }

export const storage = {
  // Settings
  getSettings: () => get(KEYS.SETTINGS) || {
    anthropicKey: '',
    gcalConnected: false,
    notificationTimes: { day: '02:45', night: '14:00', cshift: '07:30', off: '07:30' },
    onboarded: false,
  },
  saveSettings: (s) => set(KEYS.SETTINGS, s),

  // Baselines (rolling, updated weekly)
  getBaselines: () => get(KEYS.BASELINES) || {
    hrv: 65, rhr: 46, sleepHr: 6.5, weight: 213, updatedAt: null
  },
  saveBaselines: (b) => set(KEYS.BASELINES, b),

  // Daily check-ins
  getDailyCheckins: () => get(KEYS.DAILY_CHECKINS) || [],
  saveDailyCheckin: (entry) => {
    const all = get(KEYS.DAILY_CHECKINS) || []
    const idx = all.findIndex(e => e.date === entry.date)
    if (idx >= 0) all[idx] = entry; else all.push(entry)
    set(KEYS.DAILY_CHECKINS, all)
  },
  getTodayCheckin: () => {
    const today = new Date().toISOString().slice(0, 10)
    const all = get(KEYS.DAILY_CHECKINS) || []
    return all.find(e => e.date === today) || null
  },
  getRecentCheckins: (n = 7) => {
    const all = get(KEYS.DAILY_CHECKINS) || []
    return all.slice(-n)
  },

  // Weekly reviews
  getWeeklyReviews: () => get(KEYS.WEEKLY_REVIEWS) || [],
  saveWeeklyReview: (entry) => {
    const all = get(KEYS.WEEKLY_REVIEWS) || []
    const idx = all.findIndex(e => e.weekKey === entry.weekKey)
    if (idx >= 0) all[idx] = entry; else all.push(entry)
    set(KEYS.WEEKLY_REVIEWS, all)
  },
  getRecentWeeklyReviews: (n = 4) => {
    const all = get(KEYS.WEEKLY_REVIEWS) || []
    return all.slice(-n)
  },

  // Shift events (default roster + .ics import + manual edits) — persistent
  getShiftEvents: () => get(KEYS.SHIFT_EVENTS) || { events: [], importedAt: null, count: 0, lastFile: null, seeded: false },
  saveShiftEvents: (events, meta = {}) => {
    const prev = get(KEYS.SHIFT_EVENTS) || {}
    set(KEYS.SHIFT_EVENTS, { ...prev, events, count: events.length, ...meta })
  },
  clearShiftEvents: () => {
    // Keep the seeded flag so cleared defaults don't silently return
    set(KEYS.SHIFT_EVENTS, { events: [], importedAt: null, count: 0, lastFile: null, seeded: true })
  },
}
