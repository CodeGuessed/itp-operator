// Recovery prescription decision engine

export const PRESCRIPTION_LEVELS = {
  FULL: { key: 'FULL', label: 'FULL SESSION', color: 'green' },
  SHORT: { key: 'SHORT', label: 'SHORTENED', color: 'yellow' },
  ZONE2: { key: 'ZONE2', label: 'ZONE 2 ONLY', color: 'amber' },
  REST: { key: 'REST', label: 'REST', color: 'red' },
  DIVE: { key: 'DIVE', label: 'DIVE PROTOCOL', color: 'blue' },
};

const SESSIONS = {
  FULL: [
    'Primary strength block — programmed load',
    'Conditioning: 20–25min moderate intensity',
    'Accessory work as prescribed',
    'Cool-down mobility 10min',
  ],
  SHORT: [
    'Primary strength block only — no conditioning',
    'Reduce volume 20–30% from programmed',
    'Skip accessory work',
  ],
  ZONE2: [
    'Zone 2 aerobic only — HR 120–140bpm',
    'Duration: 30–45min',
    'No strength, no high-intensity',
  ],
  REST: [
    'No structured training',
    'Light walking permitted (≤30min)',
    'Sleep and nutrition priority',
  ],
  DIVE: [
    'Dive day protocol — no training before dive',
    'Post-dive: rest or zone 2 walk only',
    'Hydration and nutrition priority',
    'No breath-hold or hypoxic work 24hr post-dive',
  ],
};

export function computePrescription(inputs, baselines) {
  const { hrv, sleep, rem, rhr, shiftType, otOccurred, diveDay } = inputs;

  // Dive day overrides everything
  if (diveDay) {
    return {
      level: PRESCRIPTION_LEVELS.DIVE,
      sessions: SESSIONS.DIVE,
      flags: ['DIVE DAY'],
      rationale: 'Dive day protocol — all other recovery metrics superseded.',
      flagCount: 1,
    };
  }

  const flags = [];
  let criticalFlag = false;

  // HRV flags
  if (hrv === '<55') {
    flags.push('HRV LOW (<55)');
  } else if (hrv === '55-65' && baselines.hrv > 70) {
    flags.push('HRV BELOW BASELINE');
  }

  // Sleep flags
  if (sleep === '<5h') {
    flags.push('SLEEP CRITICAL (<5h)');
    criticalFlag = true;
  } else if (sleep === '5-6h') {
    flags.push('SLEEP LOW (5–6h)');
  }

  // REM flag
  if (rem === '<60') {
    flags.push('REM LOW (<60min)');
  }

  // RHR flag
  if (rhr === '>51') {
    flags.push('RHR ELEVATED (>51)');
  }

  // Shift flags
  if (shiftType === 'NIGHT') {
    flags.push('NIGHT SHIFT');
  }
  if (otOccurred) {
    flags.push('OVERTIME');
  }

  const flagCount = flags.length;
  const postNight = shiftType === 'NIGHT';

  let level;

  // REST conditions
  if (
    flagCount >= 3 ||
    (postNight && (sleep === '<5h' || sleep === '5-6h')) ||
    (criticalFlag && flagCount >= 2)
  ) {
    level = PRESCRIPTION_LEVELS.REST;
  }
  // ZONE 2 conditions
  else if (flagCount >= 2 || (postNight && flagCount >= 1)) {
    level = PRESCRIPTION_LEVELS.ZONE2;
  }
  // SHORTENED conditions
  else if (flagCount === 1 || shiftType === 'CSHIFT' || (shiftType === 'DAY' && otOccurred)) {
    level = PRESCRIPTION_LEVELS.SHORT;
  }
  // FULL
  else {
    level = PRESCRIPTION_LEVELS.FULL;
  }

  const rationale = buildRationale(level.key, flags, shiftType, otOccurred);

  return {
    level,
    sessions: SESSIONS[level.key],
    flags,
    rationale,
    flagCount,
  };
}

function buildRationale(levelKey, flags, shiftType, otOccurred) {
  if (flags.length === 0) return 'All recovery markers within normal range.';

  const parts = [];

  if (flags.includes('SLEEP CRITICAL (<5h)')) parts.push('sleep below critical threshold');
  else if (flags.includes('SLEEP LOW (5–6h)')) parts.push('sleep below target');

  if (flags.includes('HRV LOW (<55)')) parts.push('HRV suppressed');
  else if (flags.includes('HRV BELOW BASELINE')) parts.push('HRV below personal baseline');

  if (flags.includes('RHR ELEVATED (>51)')) parts.push('RHR elevated');
  if (flags.includes('REM LOW (<60min)')) parts.push('REM deficit');
  if (flags.includes('NIGHT SHIFT')) parts.push('night shift load');
  if (flags.includes('OVERTIME')) parts.push('overtime accumulated');

  const flagText = parts.join(', ');

  const levelText = {
    REST: 'Rest prescribed',
    ZONE2: 'Zone 2 only prescribed',
    SHORT: 'Shortened session prescribed',
    FULL: 'Full session',
  }[levelKey];

  return `${levelText} — ${flagText}.`;
}
