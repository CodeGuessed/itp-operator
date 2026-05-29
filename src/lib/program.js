// Program start: May 27, 2026 — 42 weeks, 6 cycles of 7 weeks
const PROGRAM_START = new Date('2026-05-27T00:00:00');
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

const PHASES = [
  {
    name: 'FOUNDATION',
    label: 'Phase 1 — Foundation',
    weeks: [1, 14],
    calories: { base: 2400, deficit: 200 },
    protein: 180,
  },
  {
    name: 'DEVELOPMENT',
    label: 'Phase 2 — Development',
    weeks: [15, 28],
    calories: { base: 2600, deficit: 150 },
    protein: 190,
  },
  {
    name: 'PEAK',
    label: 'Phase 3 — Peak',
    weeks: [29, 42],
    calories: { base: 2800, deficit: 100 },
    protein: 200,
  },
];

// Training rules by shift type
export const SHIFT_TRAINING_RULES = {
  DAY: {
    window: '18:30–20:30',
    notes: 'Post-shift. Moderate intensity OK if HRV normal.',
  },
  NIGHT: {
    window: '13:00–15:00',
    notes: 'Pre-shift only. Low-moderate intensity. No high CNS load.',
  },
  CSHIFT: {
    window: 'N/A',
    notes: 'Shortened session or rest. Shift spans prime recovery window.',
  },
  OFF: {
    window: 'Flexible',
    notes: 'Preferred training day. Full session if recovery permits.',
  },
};

export function getProgramPosition(date = new Date()) {
  const diff = date - PROGRAM_START;

  if (diff < 0) {
    return {
      week: 0,
      cycle: 0,
      cycleWeek: 0,
      phase: 'PRE-PROGRAM',
      isDeload: false,
      calories: null,
      protein: null,
    };
  }

  const weekNum = Math.floor(diff / MS_PER_WEEK) + 1;

  if (weekNum > 42) {
    return {
      week: weekNum,
      cycle: 6,
      cycleWeek: 7,
      phase: 'COMPLETE',
      isDeload: true,
      calories: null,
      protein: null,
    };
  }

  const cycle = Math.ceil(weekNum / 7);
  const cycleWeek = ((weekNum - 1) % 7) + 1;
  const isDeload = cycleWeek === 7;

  const phase = PHASES.find((p) => weekNum >= p.weeks[0] && weekNum <= p.weeks[1]);

  return {
    week: weekNum,
    cycle,
    cycleWeek,
    isDeload,
    phase: phase?.name || 'COMPLETE',
    phaseLabel: phase?.label || '',
    calories: phase?.calories || null,
    protein: phase?.protein || null,
  };
}

export function getCurrentPhaseTargets(date = new Date()) {
  const pos = getProgramPosition(date);
  const phase = PHASES.find((p) => p.name === pos.phase);
  return phase ? { calories: phase.calories, protein: phase.protein } : null;
}

// Gate questions shown at cycle week 6
export const PHASE_GATE_QUESTIONS = [
  'Sleep average ≥7h for last 4 weeks',
  'HRV trending stable or improving',
  'All 3 sessions completed in ≥4 of 6 weeks',
  'No persistent injury flags',
  'Weight within 2kg of phase target',
  'Protein target met most days',
  'No OCD escalation markers active',
];

export function getSundayReviewWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Returns an array of 8 weekly positions for the trends view
export function getLast8Weeks(date = new Date()) {
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(date);
    d.setDate(d.getDate() - i * 7);
    const start = getSundayReviewWeekStart(d);
    weeks.push({
      weekStart: start.toISOString().split('T')[0],
      position: getProgramPosition(start),
    });
  }
  return weeks;
}

export function formatProgramDate(date = new Date()) {
  return date.toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
