// lib/gcal.js — Google Calendar via Google Identity Services (GIS) token model
//
// Uses google.accounts.oauth2.initTokenClient — a popup-based flow that returns
// an access token directly. No redirect, no PKCE storage, no service-worker
// callback interception, no redirect-URI matching. Requires only that the app's
// origin is listed under "Authorized JavaScript origins" on the OAuth client.

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'
const CACHE_KEY = 'itp_gcal_cache'
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

export const JS_ORIGIN = window.location.origin

export function getGCalClientId() {
  try { return JSON.parse(localStorage.getItem('itp_settings'))?.gcalClientId || '' } catch { return '' }
}

// ── GIS readiness ─────────────────────────────────────────────────────────────

export function isGisReady() {
  return !!(window.google && window.google.accounts && window.google.accounts.oauth2)
}

// Wait for the gsi/client script to finish loading (up to ~10s)
function waitForGis(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (isGisReady()) { resolve(); return }
    const start = Date.now()
    const tick = setInterval(() => {
      if (isGisReady()) { clearInterval(tick); resolve() }
      else if (Date.now() - start > timeoutMs) {
        clearInterval(tick)
        reject(new Error('Google library failed to load — check your connection and retry.'))
      }
    }, 100)
  })
}

// ── Request access token (opens Google popup) ─────────────────────────────────

export async function requestAccessToken(clientId) {
  await waitForGis()

  return new Promise((resolve, reject) => {
    let settled = false
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (resp) => {
        if (settled) return
        settled = true
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error))
          return
        }
        resolve({
          access_token: resp.access_token,
          expires_in: resp.expires_in,
          expires_at: Date.now() + (resp.expires_in || 3600) * 1000,
          token_type: resp.token_type || 'Bearer',
        })
      },
      error_callback: (err) => {
        if (settled) return
        settled = true
        // err.type: 'popup_closed' | 'popup_failed_to_open' | etc.
        const map = {
          popup_closed: 'Authorization popup closed before completing.',
          popup_failed_to_open: 'Popup blocked — allow popups for this site and retry.',
        }
        reject(new Error(map[err?.type] || err?.message || 'Authorization failed.'))
      },
    })
    client.requestAccessToken({ prompt: 'consent' })
  })
}

// ── Token validation ──────────────────────────────────────────────────────────

export function isTokenValid(token) {
  if (!token?.access_token) return false
  return Date.now() < (token.expires_at - 60000)
}

// ── Calendar fetch ────────────────────────────────────────────────────────────

export async function fetchCalendarEvents(accessToken, daysAhead = 14) {
  const now = new Date()
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)
  const past   = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000)

  const params = new URLSearchParams({
    timeMin: past.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error(`GCal API error: ${res.status}`)
  return (await res.json()).items || []
}

// ── Event cache ───────────────────────────────────────────────────────────────

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
