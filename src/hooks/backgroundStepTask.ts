/**
 * backgroundStepTask.ts
 *
 * ⚠️  IMPORTANT — import this file in your App.tsx (or index.ts) at the very
 * top, before any component renders:
 *
 *   import './backgroundStepTask';   // ← add this line
 *
 * TaskManager.defineTask MUST be called at module level, outside any hook or
 * component.  If it runs inside useEffect / a hook, Android silently ignores
 * it and the background task does nothing.
 */

import * as BackgroundFetch from 'expo-background-fetch';
import { Pedometer } from 'expo-sensors';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '../lib/supabase';           // adjust path if needed
import { getMidnight, stepsToCalories, stepsToDistance } from './useStepCounter';

export const BACKGROUND_STEP_TASK = 'background-step-task';

// ─── Define the task ────────────────────────────────────────────────────────
// This block runs every ~15 minutes even when the app is completely closed.
// Android's hardware step-counter chip keeps accumulating steps regardless of
// app state, so getStepCountAsync always returns the true total for today.
TaskManager.defineTask(BACKGROUND_STEP_TASK, async () => {
  try {
    // 1. Recover the user session from AsyncStorage (supabase-js persists it)
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 2. Read today's steps from the hardware pedometer chip
    const midnight = getMidnight();
    const now      = new Date();
    const { steps } = await Pedometer.getStepCountAsync(midnight, now);
    const safeSteps = Math.max(0, steps);

    if (safeSteps === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 3. Upsert into Supabase so the count is never lost
    await supabase.rpc('upsert_steps', {
      p_user_id:     session.user.id,
      p_steps:       safeSteps,
      p_calories:    stepsToCalories(safeSteps),
      p_distance_km: stepsToDistance(safeSteps),
    });

    console.log(`[BackgroundStepTask] Synced ${safeSteps} steps`);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    console.warn('[BackgroundStepTask] Failed:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
