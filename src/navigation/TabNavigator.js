// 
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import ConnectScreen from '../screens/ConnectScreen';
import { Colors } from '../../constants/theme';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 0.5,
          paddingBottom: Platform.OS === 'android' 
            ? insets.bottom + 8  // respects gesture bar on Android
            : insets.bottom + 4, // respects home indicator on iPhone
          paddingTop: 8,
          height: Platform.OS === 'android'
            ? insets.bottom + 64
            : insets.bottom + 60,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { 
          fontSize: 11, 
          fontWeight: '600', 
          marginTop: 2 
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>⚡</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Ranking"
        component={LeaderboardScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🏆</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Connect"
        component={ConnectScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>👥</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}