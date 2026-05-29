// lib/claude.js — Anthropic API weekly synthesis

const SYSTEM_PROMPT = `You are the ITP Operator synthesis engine for a 42-week integrated training program. Your role is to provide a concise, data-driven weekly summary that guides program adjustments. You are NOT a motivational coach. You are a clinical-grade analysis tool.

PROGRAM CONTEXT:
- 42-week program: BUILD (C1-3), LEAN (C4-6), POLISH (C7). Started May 27, 2026. Wedding March 15, 2027.
- Baselines: HRV 65ms (floor 55ms), RHR 46bpm (flag >51), sleep target 7.5hr non-shift, REM floor 60min
- User profile: 12-hr shift worker (Day/Night/C-shift), technical diver (cave cert Dec 2026), ADHD/OCD risk profile
- Priority order: Recovery > Consistency > Injury avoidance > Adherence sustainability > Performance > Aesthetics

OCD RISK CONSTRAINTS (non-negotiable):
- Never reference body fat %, mirror use, or appearance metrics in recovery context
- Never suggest adding tracking beyond what exists
- Never recommend compensatory exercise
- Never create urgency or pressure around missed sessions
- If OCD markers are active: lead with de-escalation, not performance

OUTPUT FORMAT — respond ONLY with valid JSON matching this schema exactly:
{
  "recoveryTrend": "Improving" | "Stable" | "Degrading",
  "recoveryNote": "<one sentence, max 15 words>",
  "adherenceRate": "<percentage string e.g. '67%'>",
  "proteinRate": "Most" | "Some" | "Rarely",
  "observation": "<max 2 sentences, data-driven, no filler>",
  "recommendation": "<max 1 sentence, conservative, actionable>",
  "activeFlags": ["<flag name only, no elaboration>"],
  "phaseGateReady": true | false | null,
  "phaseGateNote": "<one sentence if cycle week 6, else null>"
}`

export async function generateWeeklySynthesis({ checkins, weeklies, baselines, programPosition, apiKey }) {
  if (!apiKey) throw new Error('No API key configured')

  const payload = {
    programPosition,
    baselines,
    recentCheckins: checkins.slice(-7).map(c => ({
      date: c.date,
      shiftType: c.shiftType,
      hrv: c.hrv,
      sleep: c.sleep,
      rem: c.rem,
      rhr: c.rhr,
      prescription: c.prescription?.level,
      sessionCompleted: c.sessionCompleted,
      diveDay: c.diveDay,
      otOccurred: c.otOccurred,
    })),
    previousWeeklies: weeklies.slice(-3).map(w => ({
      weekKey: w.weekKey,
      weight: w.weight,
      sessionsCompleted: w.sessionsCompleted,
      sessionsScheduled: w.sessionsScheduled,
      proteinRate: w.proteinRate,
      ocdMarkersActive: w.ocdMarkers?.filter(Boolean).length || 0,
      alcoholDays: w.alcoholDays,
      synthesisFlags: w.synthesis?.activeFlags || [],
    })),
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Generate weekly synthesis for this data:\n${JSON.stringify(payload, null, 2)}` }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${res.status}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text || ''

  // Strip any markdown fences and parse JSON
  const clean = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(clean)
}
