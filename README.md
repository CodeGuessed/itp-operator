# ITP Operator

Shift-aware recovery operating system for a 42-week integrated training program. PWA installable on iOS via Safari Add to Home Screen.

**Live:** https://CodeGuessed.github.io/itp-operator/

---

## Prerequisites

- Node.js 20+
- An Anthropic API key (for weekly synthesis — optional)

---

## Shift Calendar Import (.ics)

The app reads your shift schedule from an **iCalendar (.ics) file** — no Google login,
no OAuth, no network access. Your shift data never leaves the device.

### Export your shifts as .ics

**From Google Calendar (desktop):**
1. [calendar.google.com](https://calendar.google.com) → Settings (gear) → **Settings**
2. Left sidebar → **Import & export** → **Export**
3. This downloads a `.zip` containing one `.ics` per calendar — unzip it
4. (Alternatively, to export a single calendar: Settings → click the calendar → **Export calendar**)

**From Apple Calendar (Mac):** File → Export → Export… saves an `.ics`.

### Load it into the app
1. Open the app → **Settings** → **Shift Calendar (.ics import)**
2. Tap **Import .ics File** → pick the `.ics`
3. The app scans events, keeps shift-bearing ones, and shows how many loaded
4. Re-import anytime to refresh — entries merge and de-duplicate

---

## First-Run Setup

1. Open the app: https://CodeGuessed.github.io/itp-operator/
2. Tap **Settings** (bottom nav)
3. (Optional) Enter your **Anthropic API key** → Save (only needed for weekly synthesis)
4. Tap **Import .ics File** and load your exported shift calendar
5. Set your **Garmin baselines** (HRV, RHR, Sleep avg from your device history)
6. Tap **Request Notifications** to enable check-in reminders
7. Install as PWA (see below)

---

## iOS Install + .ics Import

Web Push notifications on iOS require the app to be installed as a PWA (iOS 16.4+):

1. Open **Safari** on your iPhone
2. Navigate to: `https://CodeGuessed.github.io/itp-operator/`
3. Tap the **Share** button (box with arrow pointing up)
4. Scroll down and tap **Add to Home Screen** → **Add**
5. Open the app from the Home Screen icon
6. In Settings, tap **Request Notifications** — iOS will prompt for permission

**Getting the .ics onto your iPhone:** email the exported `.ics` to yourself (or put it
in iCloud Drive / Files), then from the app's **Import .ics File** picker choose
**Browse** → locate the file. The iOS file picker can read Files, iCloud Drive, and
recent mail attachments.

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

## Shift Event Naming

The app detects shift type from `.ics` event titles. Both bracket codes and
verbose titles are recognised:

| Title contains | Shift |
|---|---|
| `[N]` or `Night Shift` | NIGHT (17:30–06:00) |
| `[D]` or `Day Shift` | DAY (05:30–18:00) |
| `[C]`, `C-Shift`, or `C-SHIFT` | CSHIFT (11:00–23:00) |
| `Dive` / `Dive Day` | DIVE DAY |
| `[OT]` or `Overtime` | Overtime modifier |
| No shift event that day | OFF |

Imported shifts are filtered to a window of roughly the last month through the
next ~5 months, so only relevant events are stored.

---

## Data & Privacy

- All data stored in browser localStorage — never leaves your device
- Shift calendar: parsed locally from your `.ics` file; no network, no Google login
- Anthropic API: the only outbound call, made only when you tap "Generate Weekly Synthesis"
- Export your data anytime from Settings → Export JSON
