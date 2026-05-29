const KEYS = {
  DAILY: 'itp_daily',
  WEEKLY: 'itp_weekly',
  SETTINGS: 'itp_settings',
  BASELINES: 'itp_baselines',
};

export const DEFAULT_BASELINES = {
  hrv: 65,
  rhr: 49,
  sleep: 6.5,
};

export const DEFAULT_SETTINGS = {
  apiKey: '',
  gcalClientId: '',
  gcalToken: null,
  notificationTimes: {
    DAY: '02:45',
    NIGHT: '14:00',
    CSHIFT: '07:30',
    OFF: '07:30',
    SUNDAY: '07:30',
  },
};

export function getSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      notificationTimes: { ...DEFAULT_SETTINGS.notificationTimes, ...(stored.notificationTimes || {}) },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export function getBaselines() {
  try {
    return { ...DEFAULT_BASELINES, ...JSON.parse(localStorage.getItem(KEYS.BASELINES) || '{}') };
  } catch {
    return { ...DEFAULT_BASELINES };
  }
}

export function saveBaselines(baselines) {
  localStorage.setItem(KEYS.BASELINES, JSON.stringify(baselines));
}

function dateKey(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

export function getDailyLog(date) {
  const key = `${KEYS.DAILY}_${dateKey(date)}`;
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

export function saveDailyLog(date, data) {
  const key = `${KEYS.DAILY}_${dateKey(date)}`;
  localStorage.setItem(key, JSON.stringify({ ...data, updatedAt: Date.now() }));
}

export function getWeeklyLog(weekStart) {
  const key = `${KEYS.WEEKLY}_${dateKey(weekStart)}`;
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

export function saveWeeklyLog(weekStart, data) {
  const key = `${KEYS.WEEKLY}_${dateKey(weekStart)}`;
  localStorage.setItem(key, JSON.stringify({ ...data, updatedAt: Date.now() }));
}

export function getRecentDailyLogs(days = 7) {
  const logs = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const log = getDailyLog(d);
    if (log) logs.push({ date: dateKey(d), ...log });
  }
  return logs.reverse();
}

export function getAllDailyLogs() {
  const logs = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(KEYS.DAILY + '_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data) logs.push({ date: key.replace(KEYS.DAILY + '_', ''), ...data });
      } catch {}
    }
  }
  return logs.sort((a, b) => a.date.localeCompare(b.date));
}

export function getAllWeeklyLogs() {
  const logs = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(KEYS.WEEKLY + '_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data) logs.push({ weekStart: key.replace(KEYS.WEEKLY + '_', ''), ...data });
      } catch {}
    }
  }
  return logs.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export function exportAllData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('itp_')) {
      try {
        data[key] = JSON.parse(localStorage.getItem(key));
      } catch {
        data[key] = localStorage.getItem(key);
      }
    }
  }
  return data;
}

export function clearAllData() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('itp_')) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

// Track last night shift for body battery suppression
export function getLastNightShiftDate() {
  const logs = getAllDailyLogs();
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].shiftType === 'NIGHT') return new Date(logs[i].date);
  }
  return null;
}

export function isBodyBatterySuppressed(shiftType) {
  if (shiftType === 'NIGHT' || shiftType === 'CSHIFT') return true;
  const lastNight = getLastNightShiftDate();
  if (!lastNight) return false;
  const hoursSince = (Date.now() - lastNight.getTime()) / (1000 * 60 * 60);
  return hoursSince < 24;
}
