const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
const BASE_URL = '/itp-operator/';

function parseShiftFromTitle(title) {
  if (!title) return null;
  const t = title.toUpperCase();

  // Order matters — check most specific first
  if (/\[N\]/.test(t)) return 'NIGHT';
  if (/\[D\]/.test(t)) return 'DAY';
  if (/\[C\]/.test(t) || t.includes('C-SHIFT')) return 'CSHIFT';
  if (t.includes('[OT]')) return 'OT';
  if (t.includes('DIVE')) return 'DIVE';
  return null;
}

export async function fetchTodayShift(gcalToken) {
  if (!gcalToken || !gcalToken.token) return { shiftType: 'OFF', isOT: false, isDive: false };

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  try {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', start.toISOString());
    url.searchParams.set('timeMax', end.toISOString());
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '50');

    const resp = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${gcalToken.token}` },
    });

    if (!resp.ok) {
      if (resp.status === 401) return { error: 'TOKEN_EXPIRED' };
      return { shiftType: 'OFF', isOT: false, isDive: false, error: `HTTP ${resp.status}` };
    }

    const data = await resp.json();
    const events = data.items || [];

    let shiftType = 'OFF';
    let isOT = false;
    let isDive = false;

    for (const event of events) {
      const parsed = parseShiftFromTitle(event.summary);
      if (parsed === 'OT') isOT = true;
      else if (parsed === 'DIVE') isDive = true;
      else if (parsed) shiftType = parsed;
    }

    return { shiftType, isOT, isDive };
  } catch (e) {
    return { shiftType: 'OFF', isOT: false, isDive: false, error: e.message };
  }
}

export function initiateOAuthFlow(clientId) {
  const redirectUri = window.location.origin + BASE_URL;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: SCOPES,
    include_granted_scopes: 'true',
    prompt: 'select_account',
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  window.location.href = authUrl;
}

export function parseOAuthCallback() {
  const hash = window.location.hash.substring(1);
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');
  if (accessToken) {
    // Clean the hash from the URL without reload
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return {
      token: accessToken,
      expiresAt: Date.now() + parseInt(expiresIn || '3600') * 1000,
    };
  }
  return null;
}

export function isTokenValid(gcalToken) {
  if (!gcalToken || !gcalToken.token) return false;
  // Treat as expired 5 minutes early
  return gcalToken.expiresAt > Date.now() + 5 * 60 * 1000;
}

export function tokenExpiresIn(gcalToken) {
  if (!gcalToken || !gcalToken.token) return 0;
  return Math.max(0, Math.floor((gcalToken.expiresAt - Date.now()) / 60000));
}
