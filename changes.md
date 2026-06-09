## Bug 1 (Critical) — Android kills the JS thread in background

**Where:** `startSubscription()`, line ~130

`Pedometer.watchStepCount()` runs entirely in the JavaScript thread. When Android sends your app to the background, the JS thread is suspended or killed. The callback never fires. There is no native background service keeping it alive. Steps walked while backgrounded are permanently lost — they never increment `totalStepsRef`.

**Fix:** Install `expo-android-pedometer` which runs a native Android foreground service with a persistent notification, keeping step counting alive even when the app is killed.

```bash
npx expo install expo-android-pedometer
```

---

## Bug 2 (Critical) — `getStepCountAsync` silently returns 0 on Android

**Where:** `readTodayDeviceSteps()`, line ~105

```ts
const result = await Pedometer.getStepCountAsync(midnight, now);
```

This is an iOS HealthKit API. On Android, `expo-sensors` does not support date-range step queries — it either throws or returns 0. Your `catch(_)` swallows the error silently. So on Android, `trueTotal = Math.max(0, savedSteps)` — the device hardware is never consulted on resume. The app only ever shows what was last saved to Supabase.

**Fix:** Split by platform:

```ts
import { Platform } from 'react-native';
import * as AndroidPedometer from 'expo-android-pedometer';

const readTodayDeviceSteps = useCallback(async (): Promise<number> => {
  try {
    if (Platform.OS === 'ios') {
      const result = await Pedometer.getStepCountAsync(getMidnight(), new Date());
      return Math.max(0, result.steps);
    } else {
      // Android — uses the native step counter chip directly
      return await AndroidPedometer.getStepsCountAsync();
    }
  } catch (_) {
    return 0;
  }
}, []);
```

---

## Bug 3 (High) — Stale closure causes AppState listener churn

**Where:** AppState `useEffect`, line ~220

```ts
useEffect(() => {
  const sub = AppState.addEventListener('change', async (state) => { ... });
  return () => sub.remove();
}, [initSteps, syncToSupabase]); // ← these recreate on every render
```

`initSteps` and `syncToSupabase` are `useCallback` functions whose deps change. Every time the component re-renders, the old listener is removed and a new one is added. During rapid foreground/background transitions this creates race conditions — two listeners fire simultaneously, both calling `initSteps()`.

**Fix:** Use refs inside the listener so the effect only runs once:

```ts
const initStepsRef = useRef(initSteps);
const syncToSupabaseRef = useRef(syncToSupabase);
useEffect(() => { initStepsRef.current = initSteps; }, [initSteps]);
useEffect(() => { syncToSupabaseRef.current = syncToSupabase; }, [syncToSupabase]);

useEffect(() => {
  const sub = AppState.addEventListener('change', async (state) => {
    if (state === 'active') await initStepsRef.current();
    else await syncToSupabaseRef.current(totalStepsRef.current);
  });
  return () => sub.remove();
}, []); // empty deps — listener registered exactly once
```

---

## Bug 4 (High) — Double `initSteps()` on mount

**Where:** Main init `useEffect` (~line 258) AND AppState listener (~line 220)

On first mount, the main `useEffect` calls `initSteps()`. Simultaneously, `AppState` fires a `'active'` event on app open, which also calls `initSteps()`. Both run concurrently. This causes two simultaneous `Pedometer.getStepCountAsync` calls and two `upsert_steps` Supabase calls, with the second one potentially writing a wrong baseline.

**Fix:** Add a mount guard ref:

```ts
const isInitializedRef = useRef(false);

// In main useEffect init():
if (!isInitializedRef.current) {
  isInitializedRef.current = true;
  await initSteps();
  scheduleMidnightReset();
}

// In AppState listener:
if (state === 'active' && isInitializedRef.current) {
  await initStepsRef.current();
}
```

---

## Bug 5 (Medium) — Baseline drift after iOS background resume

**Where:** `initSteps()` → `startSubscription(trueTotal)`

When the app resumes on iOS, `initSteps()` reads the hardware steps (e.g. 5000) and sets `baseline = 5000`. Then `watchStepCount` restarts and starts counting `delta` from 0 again. This part is correct. But if the user walks 100 more steps, the subscription fires with `delta = 100`, giving `total = 5000 + 100 = 5100`. That's fine.

The problem is if `initSteps()` is called again before the subscription delta resets — for example if `AppState` fires twice. The second call sets `baseline = 5100`, and the subscription delta is still accumulating from before. You end up double-counting those 100 steps.

**Fix:** Stop the subscription before reading the new baseline, and only start a fresh one after:

```ts
const initSteps = useCallback(async () => {
  stopSubscription(); // ← stop FIRST, before reading hardware
  
  const [deviceSteps, savedSteps] = await Promise.all([
    readTodayDeviceSteps(),
    loadSavedSteps(),
  ]);
  const trueTotal = Math.max(deviceSteps, savedSteps);
  lastSyncedRef.current = trueTotal;
  updateStats(trueTotal);
  
  await startSubscription(trueTotal); // ← fresh start with clean delta
}, [stopSubscription, readTodayDeviceSteps, loadSavedSteps, updateStats, startSubscription]);
```

---

## Also needed: `app.json` permissions

For `expo-android-pedometer` to work you need to add the plugin and permission to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      ["expo-android-pedometer", {
        "notificationTitle": "MyStep",
        "notificationContent": "Tracking your steps"
      }]
    ],
    "android": {
      "permissions": ["android.permission.ACTIVITY_RECOGNITION"]
    },
    "ios": {
      "infoPlist": {
        "NSMotionUsageDescription": "MyStep uses motion data to count your steps."
      }
    }
  }
}
```

After adding the plugin you need a dev build — `expo-android-pedometer` has native code so it won't work in Expo Go. Run `expo run:android` instead.

---

**Priority order to fix:** Bug 2 → Bug 1 → Bug 4 → Bug 3 → Bug 5. Bugs 1 and 2 are why you're seeing no data after backgrounding. The rest cause data corruption and instability once those are fixed.