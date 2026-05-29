// lib/gcal.js — Google Calendar OAuth + event fetching

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'
const REDIRECT_URI = `${window.location.origin}/itp-operator/`
const TOKEN_KEY = 'itp_gcal_token'
const CACHE_KEY = 'itp_gcal_cache'
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

export function getGCalClientId() {
  try { return JSON.parse(localStorage.getItem('itp_settings'))?.gcalClientId || '' } catch { return '' }
}

export function buildAuthUrl(clientId) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'token',
    scope: SCOPES,
    include_granted_scopes: 'true',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export function parseTokenFromHash() {
  const hash = window.location.hash.substring(1)
  if (!hash) return null
  const params = new URLSearchParams(hash)
  if (!params.get('access_token')) return null
  return {
    access_token: params.get('access_token'),
    expires_in: parseInt(params.get('expires_in') || '3600'),
    expires_at: Date.now() + parseInt(params.get('expires_in') || '3600') * 1000,
    token_type: params.get('token_type'),
  }
}

export function isTokenValid(token) {
  if (!token?.access_token) return false
  return Date.now() < (token.expires_at - 60000) // 1min buffer
}

export async function fetchCalendarEvents(accessToken, daysAhead = 14) {
  const now = new Date()
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)
  const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const params = new URLSearchParams({
    timeMin: past.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) throw new Error(`GCal API error: ${res.status}`)
  const data = await res.json()
  return data.items || []
}

export function getCachedEvents() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cache = JSON.parse(raw)
    if (Date.now() - cache.cachedAt > CACHE_TTL) return null
    return cache.events
  } catch { return null }
}

export function setCachedEvents(events) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ events, cachedAt: Date.now() }))
  } catch (e) { console.error('Cache write failed', e) }
}
