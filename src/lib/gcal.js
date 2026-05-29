// lib/gcal.js — Google Calendar OAuth (PKCE / authorization code flow)

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'
const REDIRECT_URI = `${window.location.origin}/itp-operator/`
const CACHE_KEY = 'itp_gcal_cache'
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours
const PKCE_KEY = 'itp_pkce_verifier'

export function getGCalClientId() {
  try { return JSON.parse(localStorage.getItem('itp_settings'))?.gcalClientId || '' } catch { return '' }
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function randomBase64url(byteLength = 32) {
  const buf = new Uint8Array(byteLength)
  crypto.getRandomValues(buf)
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function sha256Base64url(plain) {
  const data = new TextEncoder().encode(plain)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// ── Auth URL (async — must await) ─────────────────────────────────────────────

export async function buildAuthUrl(clientId) {
  const verifier = randomBase64url(32)
  const challenge = await sha256Base64url(verifier)
  sessionStorage.setItem(PKCE_KEY, verifier)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'online',
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

// ── Callback parsing (code lands in query string, not hash) ───────────────────

export function parseCodeFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  if (!code) return null
  history.replaceState(null, '', window.location.pathname)
  return code
}

// ── Token exchange (PKCE — no client_secret required for public clients) ──────

export async function exchangeCodeForToken(code, clientId) {
  const verifier = sessionStorage.getItem(PKCE_KEY)
  sessionStorage.removeItem(PKCE_KEY)
  if (!verifier) throw new Error('PKCE verifier missing — restart the auth flow.')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error_description || `Token exchange failed: ${res.status}`)
  }

  const data = await res.json()
  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: data.token_type,
  }
}

// ── Token validation ──────────────────────────────────────────────────────────

export function isTokenValid(token) {
  if (!token?.access_token) return false
  return Date.now() < (token.expires_at - 60000) // 1min buffer
}

// ── Calendar fetch ────────────────────────────────────────────────────────────

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

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error(`GCal API error: ${res.status}`)
  const data = await res.json()
  return data.items || []
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
