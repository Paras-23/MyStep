/**
 * MUST IMPORT THIS FILE AT THE TOP OF App.tsx:
 * import './backgroundStepTask';
 */

import * as BackgroundFetch from "expo-background-fetch";
import { Pedometer } from "expo-sensors";
import * as TaskManager from "expo-task-manager";
import { supabase } from "../lib/supabase";
import {
  getMidnight,
  stepsToCalories,
  stepsToDistance,
} from "./useStepCounter";

export const BACKGROUND_STEP_TASK = "background-step-task";

TaskManager.defineTask(BACKGROUND_STEP_TASK, async () => {
  try {
    const available = await Pedometer.isAvailableAsync();
    if (!available) return BackgroundFetch.BackgroundFetchResult.NoData;

    // refreshSession is more reliable than getSession in a cold-start / killed-app context
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    let session = sessionData?.session;

    // If session is stale, try refreshing it
    if (!session || sessionError) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      session = refreshed?.session ?? null;
    }

    if (!session?.user?.id) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const userId = session.user.id;
    const midnight = getMidnight();
    const now = new Date();

    const result = await Pedometer.getStepCountAsync(midnight, now);
    const deviceSteps = Math.max(0, result.steps);

    if (deviceSteps === 0) return BackgroundFetch.BackgroundFetchResult.NoData;

    // Fetch current DB value — never overwrite with a lower number
    // (protects against sensor resets or background task firing out of order)
    const { data: existing } = await supabase
      .from("daily_steps")
      .select("steps")
      .eq("user_id", userId)
      .maybeSingle();

    const savedSteps: number = existing?.steps ?? 0;
    const stepsToWrite = Math.max(deviceSteps, savedSteps);

    const { error } = await supabase.rpc("upsert_steps", {
      p_user_id: userId,
      p_steps: stepsToWrite,
      p_calories: stepsToCalories(stepsToWrite),
      p_distance_km: stepsToDistance(stepsToWrite),
    });

    if (error) return BackgroundFetch.BackgroundFetchResult.Failed;

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
