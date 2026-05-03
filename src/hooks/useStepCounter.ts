// hooks/useStepCounter.ts
import * as BackgroundFetch from "expo-background-fetch";
import { Pedometer } from "expo-sensors";
import * as TaskManager from "expo-task-manager";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { BACKGROUND_STEP_TASK } from "./backgroundStepTask";

export { BACKGROUND_STEP_TASK } from "./backgroundStepTask";

const STEP_LENGTH_M = 0.762;
const WEIGHT_KG = 70;
const WALKING_MET = 3.5;
const SYNC_INTERVAL = 10000;

export function stepsToCalories(steps: number): number {
  const distKm = (steps * STEP_LENGTH_M) / 1000;
  const durationHrs = distKm / 5;
  return Math.round(WALKING_MET * WEIGHT_KG * durationHrs);
}

export function stepsToDistance(steps: number): number {
  return parseFloat(((steps * STEP_LENGTH_M) / 1000).toFixed(3));
}

export function getMidnight(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

async function ensureBackgroundTaskRegistered() {
  const isRegistered =
    await TaskManager.isTaskRegisteredAsync(BACKGROUND_STEP_TASK);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_STEP_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}

export function useStepCounter() {
  const { session } = useAuth();

  const [steps, setSteps] = useState(0);
  const [calories, setCalories] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [permissionStatus, setPermissionStatus] =
    useState<string>("undetermined");

  // Heart rate is not readable via expo-sensors on most devices without HealthKit/Health Connect.
  // Return a stable placeholder so HomeScreen.tsx doesn't crash.
  const heartRate = 72;

  const subscriptionRef = useRef<any>(null);
  const totalStepsRef = useRef(0);
  const lastSyncedRef = useRef(0);
  const lastInitRef = useRef(0);
  // Track the device-reported baseline at the time the subscription was created.
  // This lets us compute an accurate absolute total from watch deltas.
  const subscriptionBaselineRef = useRef(0);

  const updateStats = (total: number) => {
    const safe = Math.max(0, total);
    totalStepsRef.current = safe;
    setSteps(safe);
    setCalories(stepsToCalories(safe));
    setDistanceKm(stepsToDistance(safe));
  };

  const syncToSupabase = useCallback(
    async (steps: number) => {
      if (!session?.user?.id) return;
      if (steps === lastSyncedRef.current) return;
      lastSyncedRef.current = steps;
      await supabase.rpc("upsert_steps", {
        p_user_id: session.user.id,
        p_steps: steps,
        p_calories: stepsToCalories(steps),
        p_distance_km: stepsToDistance(steps),
      });
    },
    [session?.user?.id],
  );

  const readDeviceSteps = async (): Promise<number> => {
    const result = await Pedometer.getStepCountAsync(getMidnight(), new Date());
    return Math.max(0, result.steps);
  };

  const loadSavedSteps = async (): Promise<number> => {
    if (!session?.user?.id) return 0;
    const { data } = await supabase
      .from("daily_steps")
      .select("steps")
      .eq("user_id", session.user.id)
      .maybeSingle();
    return data?.steps || 0;
  };

  const stopSubscription = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
  };

  const startSubscription = (deviceBaselineAtInit: number) => {
    stopSubscription();
    // Record the absolute device step count at the moment we subscribe.
    // watchStepCount gives cumulative steps since the subscription started,
    // so: absoluteTotal = deviceBaselineAtInit + delta
    subscriptionBaselineRef.current = deviceBaselineAtInit;

    subscriptionRef.current = Pedometer.watchStepCount(({ steps: delta }) => {
      // Ignore tiny/noisy deltas (single steps, sensor noise)
      if (delta < 3) return;

      // Absolute total = what the device reported at init + steps since then
      const absoluteFromDevice = subscriptionBaselineRef.current + delta;

      // Never go below what we've already recorded (protects against sensor resets)
      const total = Math.max(totalStepsRef.current, absoluteFromDevice);
      updateStats(total);
    });
  };

  const initSteps = useCallback(async () => {
    if (Date.now() - lastInitRef.current < 5000) return;
    lastInitRef.current = Date.now();

    const [deviceSteps, savedSteps] = await Promise.all([
      readDeviceSteps(),
      loadSavedSteps(),
    ]);

    const trueTotal = Math.max(deviceSteps, savedSteps);
    updateStats(trueTotal);
    startSubscription(deviceSteps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]); // loadSavedSteps & startSubscription are stable non-reactive refs

  // App foreground/background transitions
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        await initSteps();
      } else {
        await syncToSupabase(totalStepsRef.current);
      }
    });
    return () => sub.remove();
  }, [initSteps, syncToSupabase]); // ✅ added syncToSupabase

  // Periodic sync
  useEffect(() => {
    const timer = setInterval(() => {
      syncToSupabase(totalStepsRef.current);
    }, SYNC_INTERVAL);
    return () => clearInterval(timer);
  }, [syncToSupabase]); // ✅ now safe because syncToSupabase is memoized

  // Boot-up initialization
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const available = await Pedometer.isAvailableAsync();
      setIsAvailable(available);
      if (!available) return;

      const { status } = await Pedometer.requestPermissionsAsync();
      setPermissionStatus(status);
      if (status !== "granted") return;

      if (mounted) {
        await initSteps();
        await ensureBackgroundTaskRegistered();
      }
    };

    init();

    return () => {
      mounted = false;
      stopSubscription();
    };
  }, []);

  const forceSync = async () => {
    // Re-read from device on manual sync for maximum accuracy
    const deviceSteps = await readDeviceSteps();
    const total = Math.max(totalStepsRef.current, deviceSteps);
    updateStats(total);
    await syncToSupabase(total);
  };

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
