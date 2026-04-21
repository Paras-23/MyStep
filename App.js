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
import { View, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import RegisterScreen from './src/screens/RegisterScreen';
import LoginScreen from './src/screens/LoginScreen';
import TabNavigator from './src/navigation/TabNavigator';
import { Colors } from './constants/theme';

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