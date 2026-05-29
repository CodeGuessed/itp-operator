const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

export async function generateWeeklySynthesis(apiKey, weekData) {
  if (!apiKey) throw new Error('No API key configured. Add your key in Settings.');

  const { programPosition, dailyLogs, weeklyInput, baselines } = weekData;

  const ocdActiveCount = (weeklyInput.ocdMarkers || []).filter(Boolean).length;
  const dailySummary = dailyLogs
    .map(
      (d) =>
        `${d.date}: HRV=${d.hrv || 'N/A'} | Sleep=${d.sleep || 'N/A'} | Shift=${d.shiftType || 'N/A'} | Rx=${d.prescription || 'N/A'} | EOD=${d.eod?.result || 'N/A'}`
    )
    .join('\n');

  const prompt = `You are a recovery analysis system for a 12-hour shift worker on a 42-week integrated training program. Provide a clinical, data-driven weekly synthesis. No motivational language. No streaks. No scores. No "you missed" framing. No compensatory suggestions.

PROGRAM POSITION
Phase: ${programPosition.phase} | Cycle: ${programPosition.cycle} | Week: ${programPosition.week} | Cycle week: ${programPosition.cycleWeek}${programPosition.isDeload ? ' (DELOAD)' : ''}

WEEKLY INPUTS
Weight: ${weeklyInput.weight ? weeklyInput.weight + 'kg' : 'not recorded'}
Sessions completed: ${weeklyInput.sessions}/3
Protein compliance: ${weeklyInput.protein || 'not recorded'}
Alcohol: ${weeklyInput.alcohol || 'not recorded'}
OCD markers active: ${ocdActiveCount}/5

DAILY RECOVERY DATA (last 7 days)
${dailySummary || 'No data recorded'}

BASELINES
HRV: ${baselines.hrv} | RHR: ${baselines.rhr} | Sleep avg: ${baselines.sleep}h

INSTRUCTIONS
Provide exactly these 5 fields as valid JSON. No markdown, no preamble, no explanation outside the JSON.
- trend: exactly one of "IMPROVING", "STABLE", or "DECLINING"
- adherencePercent: integer 0-100 (sessions/3 weighted 60%, nutrition 40%)
- observation: 2-3 clinical sentences, data-driven only, no motivational framing
- recommendation: 1-2 specific, actionable items for next week only
- flags: array of strings for active concerns, or empty array if none

JSON format:
{
  "trend": "...",
  "adherencePercent": 0,
  "observation": "...",
  "recommendation": "...",
  "flags": []
}`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    let msg = `API error ${response.status}`;
    try {
      const err = await response.json();
      msg = err.error?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Response did not contain valid JSON');

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Failed to parse synthesis response');
  }
}
