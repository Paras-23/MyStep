// // App.js
// import { NavigationContainer } from "@react-navigation/native";
// import { createNativeStackNavigator } from "@react-navigation/native-stack";
// import TabNavigator from "./src/navigation/TabNavigator";
// import RegisterScreen from "./src/screens/RegisterScreen";

// const Stack = createNativeStackNavigator();

// export default function App() {
//   return (
//     <NavigationContainer>
//       <Stack.Navigator>
//         <Stack.Screen name="Register" component={RegisterScreen} />
//         <Stack.Screen name="Main" component={TabNavigator} />
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// }
// import AppNavigator from './src/navigation/AppNavigator';

// export default function App() {
//   return <AppNavigator />;
// }
// App.js
// import React from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { createStackNavigator } from '@react-navigation/stack';
// import RegisterScreen from './src/screens/RegisterScreen';
// import TabNavigator from './src/navigation/TabNavigator';

// const Stack = createStackNavigator();

import React from 'react';
import './src/hooks/backgroundStepTask';
import { View, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Pedometer } from 'expo-sensors';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import RegisterScreen from './src/screens/RegisterScreen';
import LoginScreen from './src/screens/LoginScreen';
import TabNavigator from './src/navigation/TabNavigator';
import { Colors } from './constants/theme';
import { supabase } from './src/lib/supabase';
import { BACKGROUND_STEP_TASK, getMidnight, stepsToCalories, stepsToDistance } from './src/hooks/useStepCounter';

TaskManager.defineTask(BACKGROUND_STEP_TASK, async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const available = await Pedometer.isAvailableAsync();
    if (!available) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const midnight = getMidnight();
    const now = new Date();
    const result = await Pedometer.getStepCountAsync(midnight, now);
    const steps = Math.max(0, result.steps);

    if (steps > 0) {
      await supabase.rpc('upsert_steps', {
        p_user_id: session.user.id,
        p_steps: steps,
        p_calories: stepsToCalories(steps),
        p_distance_km: stepsToDistance(steps),
      });
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.warn('Background Fetch Error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

const Stack = createStackNavigator();

function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: true }}>
      {session ? (
        <Stack.Screen name="Main" component={TabNavigator} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar
            barStyle="light-content"
            backgroundColor={Colors.background}
            translucent={Platform.OS === 'android'}
          />
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}