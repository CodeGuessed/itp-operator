import { useState, useEffect, useCallback } from 'react';
import {
  getSettings,
  saveSettings,
  getBaselines,
  saveBaselines,
  getDailyLog,
  saveDailyLog,
  getWeeklyLog,
  saveWeeklyLog,
  getRecentDailyLogs,
  isBodyBatterySuppressed,
} from '../lib/storage.js';
import { getProgramPosition, getSundayReviewWeekStart } from '../lib/program.js';
import { fetchTodayShift, parseOAuthCallback, isTokenValid } from '../lib/gcal.js';
import { computePrescription } from '../lib/engine.js';

export function useAppState() {
  const [settings, setSettingsState] = useState(() => getSettings());
  const [baselines, setBaselinesState] = useState(() => getBaselines());

  const today = new Date();
  const [todayLog, setTodayLog] = useState(() => getDailyLog(today));

  const programPosition = getProgramPosition(today);
  const weekStart = getSundayReviewWeekStart(today);
  const [weeklyLog, setWeeklyLog] = useState(() => getWeeklyLog(weekStart));

  // GCal shift detection
  const [gcalShift, setGcalShift] = useState(null);
  const [gcalLoading, setGcalLoading] = useState(false);
  const [gcalError, setGcalError] = useState(null);

  // Check-in form state
  const [checkIn, setCheckInState] = useState(() => {
    const log = getDailyLog(today);
    return {
      hrv: log?.hrv || null,
      sleep: log?.sleep || null,
      rem: log?.rem || null,
      rhr: log?.rhr || null,
      shiftType: log?.shiftType || null,
      otOccurred: log?.otOccurred || false,
      diveDay: log?.diveDay || false,
    };
  });

  // Prescription state
  const [prescription, setPrescription] = useState(() => {
    const log = getDailyLog(today);
    return log?.prescription || null;
  });

  // EOD state
  const [eod, setEodState] = useState(() => {
    const log = getDailyLog(today);
    return log?.eod || null;
  });

  // Handle OAuth callback on load
  useEffect(() => {
    const oauthResult = parseOAuthCallback();
    if (oauthResult) {
      const updated = { ...settings, gcalToken: oauthResult };
      saveSettings(updated);
      setSettingsState(updated);
    }
  }, []);

  // Fetch GCal shift on load if token valid
  useEffect(() => {
    const token = settings.gcalToken;
    if (!isTokenValid(token)) return;

    setGcalLoading(true);
    fetchTodayShift(token)
      .then((result) => {
        if (result?.error === 'TOKEN_EXPIRED') {
          const updated = { ...settings, gcalToken: null };
          saveSettings(updated);
          setSettingsState(updated);
          setGcalError('Token expired — reconnect Google Calendar in Settings.');
        } else if (result) {
          setGcalShift(result);
          // Auto-populate shift if not already set
          if (!checkIn.shiftType && result.shiftType !== 'OFF') {
            setCheckInState((prev) => ({
              ...prev,
              shiftType: result.shiftType,
              otOccurred: result.isOT,
              diveDay: result.isDive,
            }));
          }
        }
      })
      .catch((e) => setGcalError(e.message))
      .finally(() => setGcalLoading(false));
  }, [settings.gcalToken]);

  const updateSettings = useCallback((updates) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...updates };
      saveSettings(next);
      return next;
    });
  }, []);

  const updateBaselines = useCallback((updates) => {
    setBaselinesState((prev) => {
      const next = { ...prev, ...updates };
      saveBaselines(next);
      return next;
    });
  }, []);

  const updateCheckIn = useCallback((field, value) => {
    setCheckInState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const generatePrescription = useCallback(() => {
    const result = computePrescription(checkIn, baselines);
    setPrescription(result);

    const logData = {
      ...checkIn,
      prescription: result.level.key,
      prescriptionDetail: result,
      generatedAt: Date.now(),
    };
    saveDailyLog(today, { ...getDailyLog(today), ...logData });
    setTodayLog(getDailyLog(today));
    return result;
  }, [checkIn, baselines]);

  const saveEod = useCallback((eodData) => {
    setEodState(eodData);
    const existing = getDailyLog(today) || {};
    saveDailyLog(today, { ...existing, eod: eodData });
    setTodayLog(getDailyLog(today));
  }, []);

  const saveWeekly = useCallback(
    (data) => {
      saveWeeklyLog(weekStart, data);
      setWeeklyLog(getWeeklyLog(weekStart));
    },
    [weekStart]
  );

  const refreshGcal = useCallback(() => {
    const token = settings.gcalToken;
    if (!isTokenValid(token)) return;
    setGcalLoading(true);
    setGcalError(null);
    fetchTodayShift(token)
      .then((result) => {
        if (result) setGcalShift(result);
      })
      .catch((e) => setGcalError(e.message))
      .finally(() => setGcalLoading(false));
  }, [settings.gcalToken]);

  const bodyBatterySuppressed = isBodyBatterySuppressed(checkIn.shiftType);

  const recentLogs = getRecentDailyLogs(7);

  return {
    // Program
    programPosition,
    today,
    weekStart,

    // Settings & baselines
    settings,
    updateSettings,
    baselines,
    updateBaselines,

    // Today
    checkIn,
    updateCheckIn,
    prescription,
    generatePrescription,
    eod,
    saveEod,
    todayLog,
    bodyBatterySuppressed,

    // GCal
    gcalShift,
    gcalLoading,
    gcalError,
    refreshGcal,

    // Weekly
    weeklyLog,
    saveWeekly,

    // Recent data
    recentLogs,
  };
}
