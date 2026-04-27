import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Pedometer } from 'expo-sensors';
import * as BackgroundFetch from 'expo-background-fetch';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const BACKGROUND_STEP_TASK = 'background-step-task';

// ── Constants ──────────────────────────────────────────────
const STEP_LENGTH_M = 0.762;
const WEIGHT_KG     = 70;
const WALKING_MET   = 3.5;
const SYNC_INTERVAL = 2000;  // sync every 2 seconds

// ── Helpers ────────────────────────────────────────────────
export function stepsToCalories(steps: number): number {
  const distKm      = (steps * STEP_LENGTH_M) / 1000;
  const durationHrs = distKm / 5;
  return Math.round(WALKING_MET * WEIGHT_KG * durationHrs);
}

export function stepsToDistance(steps: number): number {
  return parseFloat(((steps * STEP_LENGTH_M) / 1000).toFixed(3));
}

// Real-time heart rate from cadence
const RESTING_HR = 62;
const MAX_HR     = 185;

export function cadenceToHeartRate(spm: number): number {
  if (spm <= 0) return RESTING_HR;
  const intensity = Math.min(0.85, (spm / 160) * 0.85);
  const hr        = RESTING_HR + (MAX_HR - RESTING_HR) * intensity;
  const variation = (Math.random() - 0.5) * 4;
  return Math.round(Math.min(MAX_HR, Math.max(RESTING_HR, hr + variation)));
}

// ── Get today's date string YYYY-MM-DD ─────────────────────
function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

// ── Get start of today (midnight) ─────────────────────────
export function getMidnight(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

// ── Hook ───────────────────────────────────────────────────
export function useStepCounter() {
  const { session } = useAuth();

  const [steps,            setSteps]            = useState(0);
  const [calories,         setCalories]         = useState(0);
  const [distanceKm,       setDistanceKm]       = useState(0);
  const [heartRate,        setHeartRate]        = useState(RESTING_HR);
  const [isAvailable,      setIsAvailable]      = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'unknown'|'granted'|'denied'>('unknown');

  const subscriptionRef  = useRef<any>(null);
  const syncTimerRef     = useRef<any>(null);
  const hrTimerRef       = useRef<any>(null);
  const midnightTimerRef = useRef<any>(null);
  const lastSyncedRef    = useRef(0);
  const totalStepsRef    = useRef(0);
  const currentDateRef   = useRef(getTodayStr());  // tracks which day we're on
  const snapshots        = useRef<{ time: number; steps: number }[]>([]);

  // ── Update all displayed stats ─────────────────────────
  const updateStats = useCallback((total: number) => {
    // Never allow negative steps
    const safe = Math.max(0, total);
    totalStepsRef.current = safe;
    snapshots.current.push({ time: Date.now(), steps: safe });
    setSteps(safe);
    setCalories(stepsToCalories(safe));
    setDistanceKm(stepsToDistance(safe));
  }, []);

  // ── Cadence for heart rate ─────────────────────────────
  const getCadence = useCallback((): number => {
    const now    = Date.now();
    const window = 10000;
    const recent = snapshots.current.filter(s => now - s.time <= window);
    snapshots.current = recent;
    if (recent.length < 2) return 0;
    const oldest   = recent[0];
    const newest   = recent[recent.length - 1];
    const stepDiff = newest.steps - oldest.steps;
    const timeDiff = (newest.time - oldest.time) / 1000;
    if (timeDiff <= 0 || stepDiff < 0) return 0;
    return (stepDiff / timeDiff) * 60;
  }, []);

  // ── Sync to Supabase ───────────────────────────────────
  const syncToSupabase = useCallback(async (currentSteps: number) => {
    if (!session?.user?.id) return;
    if (currentSteps === lastSyncedRef.current) return;
    lastSyncedRef.current = currentSteps;
    try {
      await supabase.rpc('upsert_steps', {
        p_user_id:     session.user.id,
        p_steps:       currentSteps,
        p_calories:    stepsToCalories(currentSteps),
        p_distance_km: stepsToDistance(currentSteps),
      });
    } catch (e) {
      console.warn('Sync failed:', e);
    }
  }, [session?.user?.id]);

  // ── Read TODAY's steps from device hardware pedometer ──
  // KEY FIX: We pass EXACT midnight as start time so we only
  // get steps walked today — not yesterday, not car vibrations
  // from GPS. The hardware step counter chip filters out
  // non-walking motion itself.
  const readTodayDeviceSteps = useCallback(async (): Promise<number> => {
    try {
      const midnight = getMidnight();
      const now      = new Date();
      const result   = await Pedometer.getStepCountAsync(midnight, now);
      return Math.max(0, result.steps);
    } catch (_) {
      return 0;
    }
  }, []);

  // ── Load today's saved steps from Supabase ─────────────
  const loadSavedSteps = useCallback(async (): Promise<number> => {
    if (!session?.user?.id) return 0;
    const { data } = await supabase
      .from('daily_steps')
      .select('steps')
      .eq('user_id', session.user.id)
      .eq('step_date', getTodayStr())
      .maybeSingle();
    return data?.steps || 0;
  }, [session?.user?.id]);

  // ── Stop the current pedometer subscription ────────────
  const stopSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
  }, []);

  // ── Start fresh pedometer subscription ────────────────
  // This restarts from scratch with a new baseline reading
  const startSubscription = useCallback(async (baseline: number) => {
    stopSubscription();

    // watchStepCount gives cumulative delta FROM when we subscribe
    // We add that delta to baseline (today's hardware reading at subscribe time)
    subscriptionRef.current = Pedometer.watchStepCount(({ steps: delta }) => {
      const total = baseline + delta;
      updateStats(total);
    });
  }, [stopSubscription, updateStats]);

  // ── MIDNIGHT RESET ─────────────────────────────────────
  // Resets step count to 0 at midnight every day
  const scheduleMidnightReset = useCallback(() => {
    // Clear any existing midnight timer
    if (midnightTimerRef.current) {
      clearTimeout(midnightTimerRef.current);
    }

    const now        = new Date();
    const tomorrow   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const msToMidnight = tomorrow.getTime() - now.getTime();

    midnightTimerRef.current = setTimeout(async () => {
      // It's a new day — reset everything to 0
      currentDateRef.current = getTodayStr();
      lastSyncedRef.current  = 0;
      snapshots.current      = [];
      updateStats(0);

      // Restart subscription with baseline 0 for the new day
      await startSubscription(0);

      // Schedule next midnight reset
      scheduleMidnightReset();
    }, msToMidnight);
  }, [updateStats, startSubscription]);

  // ── Full init / refresh ────────────────────────────────
  // Called on app open, foreground, and pull-to-refresh
  const initSteps = useCallback(async () => {
    const todayStr = getTodayStr();

    // If the date changed since last read, force a reset
    if (currentDateRef.current !== todayStr) {
      currentDateRef.current = todayStr;
      lastSyncedRef.current  = 0;
      snapshots.current      = [];
      updateStats(0);
    }

    // Read device hardware steps since midnight
    const [deviceSteps, savedSteps] = await Promise.all([
      readTodayDeviceSteps(),
      loadSavedSteps(),
    ]);

    // Use the maximum of hardware and saved DB value
    // This ensures we never go backwards
    const trueTotal = Math.max(deviceSteps, savedSteps);
    lastSyncedRef.current = trueTotal;
    updateStats(trueTotal);
    snapshots.current = [{ time: Date.now(), steps: trueTotal }];

    // Start a fresh subscription from this baseline
    await startSubscription(trueTotal);

    return trueTotal;
  }, [readTodayDeviceSteps, loadSavedSteps, updateStats, startSubscription]);

  // ── AppState listener ──────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state: AppStateStatus) => {
      if (state === 'active') {
        // App came to foreground — re-read hardware steps
        // This is the fix for "steps not updating after app was closed"
        await initSteps();
      } else if (state === 'background' || state === 'inactive') {
        // Save immediately before backgrounding
        await syncToSupabase(totalStepsRef.current);
      }
    });
    return () => sub.remove();
  }, [initSteps, syncToSupabase]);

  // ── Sync timer every 2 seconds ─────────────────────────
  useEffect(() => {
    syncTimerRef.current = setInterval(() => {
      syncToSupabase(totalStepsRef.current);
    }, SYNC_INTERVAL);
    return () => clearInterval(syncTimerRef.current);
  }, [syncToSupabase]);

  // ── Heart rate timer every 3 seconds ──────────────────
  useEffect(() => {
    hrTimerRef.current = setInterval(() => {
      setHeartRate(cadenceToHeartRate(getCadence()));
    }, 3000);
    return () => clearInterval(hrTimerRef.current);
  }, [getCadence]);

  // ── Main init on mount ─────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // 1. Check hardware availability
      const available = await Pedometer.isAvailableAsync();
      setIsAvailable(available);
      if (!available) return;

      // 2. Request permission — this shows the OS dialog on first launch
      const { status } = await Pedometer.requestPermissionsAsync();
      const granted = status === 'granted';
      setPermissionStatus(granted ? 'granted' : 'denied');
      if (!granted) return;

      // 3. Init steps
      if (mounted) {
        await initSteps();
        scheduleMidnightReset();
        
        // 4. Register background fetch task
        try {
          await BackgroundFetch.registerTaskAsync(BACKGROUND_STEP_TASK, {
            minimumInterval: 15 * 60, // 15 minutes
            stopOnTerminate: false, // android only
            startOnBoot: true,      // android only
          });
        } catch (err) {
          console.warn('Failed to register background fetch task:', err);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      stopSubscription();
      clearInterval(syncTimerRef.current);
      clearInterval(hrTimerRef.current);
      clearTimeout(midnightTimerRef.current);
    };
  }, [initSteps, scheduleMidnightReset, stopSubscription]);

  // ── Manual sync / pull to refresh ─────────────────────
  const forceSync = useCallback(async () => {
    await initSteps();
    await syncToSupabase(totalStepsRef.current);
  }, [initSteps, syncToSupabase]);

  return {
    steps,
    calories,
    distanceKm,
    heartRate,
    isAvailable,
    permissionStatus,
    forceSync,
  };
}
