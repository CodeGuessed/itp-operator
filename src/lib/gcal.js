// lib/gcal.js — Google Calendar OAuth (PKCE / authorization code flow)

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'
const CACHE_KEY = 'itp_gcal_cache'
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours
const PKCE_KEY = 'itp_pkce_verifier'

// Computed once at import — must match the registered redirect URI exactly
export const REDIRECT_URI = (() => {
  const { origin, pathname } = window.location
  // Normalise to the app root regardless of current path
  const base = pathname.startsWith('/itp-operator') ? '/itp-operator/' : '/'
  return origin + base
})()

export function getGCalClientId() {
  try { return JSON.parse(localStorage.getItem('itp_settings'))?.gcalClientId || '' } catch { return '' }
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function generateVerifier() {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  // base64url, no padding — valid chars only, length always 43
  return btoa(Array.from(arr, b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function deriveChallenge(verifier) {
  const encoded = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return btoa(Array.from(new Uint8Array(digest), b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ── Auth URL (async — must await in caller) ───────────────────────────────────

export async function buildAuthUrl(clientId) {
  const verifier = generateVerifier()
  const challenge = await deriveChallenge(verifier)
  sessionStorage.setItem(PKCE_KEY, verifier)

  // Build manually to avoid double-encoding of base64url chars by URLSearchParams
  const qs = [
    `client_id=${encodeURIComponent(clientId)}`,
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
    `response_type=code`,
    `scope=${encodeURIComponent(SCOPES)}`,
    `code_challenge=${challenge}`,           // already URL-safe, do not encode again
    `code_challenge_method=S256`,
    `prompt=select_account`,
  ].join('&')

  return `https://accounts.google.com/o/oauth2/v2/auth?${qs}`
}

// ── Callback parsing — code in ?code=, error in ?error= ──────────────────────

export function parseCodeFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const error = params.get('error')
  if (error) {
    history.replaceState(null, '', window.location.pathname)
    throw new Error(`Google OAuth error: ${error}`)
  }
  const code = params.get('code')
  if (!code) return null
  history.replaceState(null, '', window.location.pathname)
  return code
}

// ── Token exchange — PKCE, no client_secret required ─────────────────────────

export async function exchangeCodeForToken(code, clientId) {
  const verifier = sessionStorage.getItem(PKCE_KEY)
  sessionStorage.removeItem(PKCE_KEY)
  if (!verifier) throw new Error('PKCE verifier missing — restart the auth flow.')

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    code_verifier: verifier,
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    // Surface the raw Google error for diagnosis
    throw new Error(err.error_description || err.error || `Token exchange ${res.status}`)
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
