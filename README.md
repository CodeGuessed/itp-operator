# ITP Operator

Shift-aware recovery operating system for a 42-week integrated training program. PWA installable on iOS via Safari Add to Home Screen.

**Live:** https://CodeGuessed.github.io/itp-operator/

---

## Prerequisites

- Node.js 20+
- A Google Cloud Console project (for Google Calendar integration)
- An Anthropic API key (for weekly synthesis)

---

## Google Cloud Console Setup — OAuth 2.0 Client ID

You need a Client ID so the app can read your Google Calendar shift events.

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. Enable the **Google Calendar API**:
   - Navigate to **APIs & Services → Library**
   - Search for "Google Calendar API" → Enable it
4. Configure OAuth consent screen:
   - Navigate to **APIs & Services → OAuth consent screen**
   - User Type: **External**
   - Fill in App name (`ITP Operator`), your email as support email
   - Add scope: `https://www.googleapis.com/auth/calendar.readonly`
   - Add your Google account as a **Test user**
   - Save and continue
5. Create OAuth credentials:
   - Navigate to **APIs & Services → Credentials**
   - Click **Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `ITP Operator`
   - Under **Authorized JavaScript origins**, add:
     ```
     https://CodeGuessed.github.io
     ```
   - Under **Authorized redirect URIs**, add:
     ```
     https://CodeGuessed.github.io/itp-operator/
     ```
   - Click **Create**
6. Copy the **Client ID** (format: `123456789-abc.apps.googleusercontent.com`)

---

## First-Run Setup

1. Open the app: https://CodeGuessed.github.io/itp-operator/
2. Tap **Settings** (bottom nav)
3. Enter your **Anthropic API key** → Save
4. Paste your **Google OAuth Client ID** → tap **Connect Google Calendar**
5. Authorize the calendar read-only scope
6. Set your **Garmin baselines** (HRV, RHR, Sleep avg from your device history)
7. Tap **Request Notifications** to enable check-in reminders
8. Install as PWA (see below)

---

## iOS Install Instructions

Web Push notifications on iOS require the app to be installed as a PWA (iOS 16.4+):

1. Open **Safari** on your iPhone
2. Navigate to: `https://CodeGuessed.github.io/itp-operator/`
3. Tap the **Share** button (box with arrow pointing up)
4. Scroll down and tap **Add to Home Screen**
5. Tap **Add** (top right)
6. Open the app from the Home Screen icon
7. In Settings, tap **Request Notifications** — iOS will prompt for permission

---

## Local Development

```bash
npm install
npm run dev
```

App runs at http://localhost:5173/itp-operator/

## Deploy Manually

```bash
npm run deploy
```

Requires write access to the `gh-pages` branch.

---

## GCal Event Naming

The app parses your calendar event titles for shift type:

| Pattern | Shift |
|---|---|
| Contains `[N]` | NIGHT (17:30–06:00) |
| Contains `[D]` | DAY (05:30–18:00) |
| Contains `[C]` or `C-SHIFT` | CSHIFT (11:00–23:00) |
| Contains `DIVE` | DIVE DAY |
| Contains `[OT]` | Overtime modifier |
| No shift event | OFF |

---

## Data & Privacy

- All data stored in browser localStorage — never leaves your device
- Google Calendar: read-only, OAuth implicit flow, token expires in 1 hour
- Anthropic API: called only when you tap "Generate Weekly Synthesis"
- Export your data anytime from Settings → Export JSON
