# MyStep Project: Tech Stack & Process Summary

This document provides a detailed breakdown of the technologies used, project configuration, and the steps followed to set up and start the application.

---

## 1. Technology Stack

The **MyStep** application is built on top of the **Expo** ecosystem for mobile (iOS/Android) and web development.

### Core Frameworks & Languages
* **React Native & Expo**: Built using Expo (`~54.0.33`) and React Native (`0.81.5`).
* **React**: Powered by React (`19.1.0`) and React DOM (`19.1.0`).
* **Languages**: Fully configured with **TypeScript** (`~5.9.2`) and modern **JavaScript**.

### Backend & Databases
* **Supabase**: Utilized as a backend database and authentication service via `@supabase/supabase-js` (configured in `src/lib/supabase.ts`).
* **Firebase**: Configured with Cloud Firestore in `firebase.js` for additional data storage/realtime sync capabilities.

### Navigation & UX
* **React Navigation**: Utilizes React Navigation v7 (`@react-navigation/native`, `@react-navigation/stack`, `@react-navigation/bottom-tabs`) for stack navigation and tab-based layouts.
* **Gestures & Animations**: Uses `react-native-gesture-handler` and `react-native-reanimated` for native-feeling UI transitions and gestures.
* **Safe Areas**: Managed via `react-native-safe-area-context` for modern screens with notches.

### Development & Tools
* **Linter**: Configured with **ESLint** (`eslint-config-expo`, `eslint` `^9.25.0`).
* **Asset Utilities**: `expo-image`, `expo-haptics`, `expo-symbols`, `expo-font`, and `expo-splash-screen`.

---

## 2. Project Structure

A summary of the core directories and files in the workspace:
* `App.js`: Entry point of the application setting up providers (`GestureHandlerRootView`, `SafeAreaProvider`, `AuthProvider`, `NavigationContainer`) and routing.
* `src/`: Core source directory containing:
  * `components/`: Reusable UI components.
  * `context/`: AuthContext (`AuthProvider`, session status, loading indicator).
  * `lib/`: Initialization files (e.g., Supabase client).
  * `navigation/`: Layout and tab/stack routing definitions.
  * `screens/`: Individual views (e.g., `LoginScreen`, `RegisterScreen`).
* `constants/`: Configuration files like theme styling/colors.
* `scripts/`: Utilities such as `reset-project.js` to clear the boilerplate.

---

## 3. Development Process Followed

Here is the chronological process followed in the current workspace:

### Step 1: Navigated to Project Directory
* Switched directory to the main project root folder:
  ```powershell
  cd .\MyStep\
  ```

### Step 2: Package Installation
* Installed all dependencies declared in `package.json` to create `node_modules`:
  ```powershell
  npm install
  ```

### Step 3: Run Attempt & Debugging
* Attempted to run the app using:
  ```powershell
  npm run dev
  ```
  * **Result**: Failed with `npm error Missing script: "dev"`.
* Ran `npm run` to view the lifecycle scripts configured in `package.json`:
  * `start` &rarr; `expo start`
  * `reset-project` &rarr; `node ./scripts/reset-project.js`
  * `android` &rarr; `expo run:android`
  * `ios` &rarr; `expo run:ios`
  * `web` &rarr; `expo start --web`
  * `lint` &rarr; `expo lint`

### Step 4: Started the Development Server
* Executed the correct command to launch the Expo dev server:
  ```powershell
  npm start
  ```
* The bundler successfully started, and the application is running in development mode.

---

## 4. Verification of Pedometer & AppState Strategies

We verified the current codebase against the following required/suggested pedometer strategies:

| Strategy / Tech Recommendation | Status in Project | Implementation Details & Code Reference |
| :--- | :--- | :--- |
| **1. AppState listener** (query missed steps on foreground via `getStepCountAsync` / re-init) | **Implemented** | An `AppState` listener is active in [useStepCounter.ts](file:///c:/Users/Acer/Desktop/New%20folder/MyStep/src/hooks/useStepCounter.ts#L220-L232). When the state changes to `'active'`, it triggers `initSteps()`, querying native steps via `getStepCountAsync` and restarting the pedometer subscription with the new baseline. |
| **2. expo-android-pedometer** (for Android background step tracking via foreground service) | **Implemented** | The `expo-android-pedometer` package is installed and integrated via `AndroidPedometer.getStepsCountAsync()` in `useStepCounter.ts`. The plugin is added in `app.json` and a dev build is required. |
| **3. Persist timestamp** (AsyncStorage or Supabase to track last checked window) | **Not Implemented** | The project upserts the steps to Supabase, but it does not save/track a specific "last checked timestamp" to compute query windows. Instead, it queries from static `midnight` to `now` upon resume. |
| **4. Reconcile against native history** (do not rely solely on active JS listeners) | **Implemented** | Upon resume, `initSteps()` calls `readTodayDeviceSteps()` to fetch the native history from midnight to now, then does `Math.max(deviceSteps, savedSteps)` to reconcile steps and prevent data loss. |
| **5. Mount guard & subscription stop** (prevent double init & baseline drift) | **Implemented** | Added `isInitializedRef` guard and `stopSubscription()` before reading steps to avoid duplicate init and ensure clean baseline. |

### Verification Strategy & How We Checked
1. **Dependency Analysis**: Checked [package.json](file:///c:/Users/Acer/Desktop/New%20folder/MyStep/package.json) to inspect if `expo-android-pedometer` or background tracking libraries are installed.
2. **Hook Inspection**: Examined [useStepCounter.ts](file:///c:/Users/Acer/Desktop/New%20folder/MyStep/src/hooks/useStepCounter.ts) to check the AppState subscription and baseline logic.
3. **Logic Flow Verification**: Traced the `AppState` transitions to ensure it correctly fetches native hardware steps when the app shifts from the background/inactive to the active state.