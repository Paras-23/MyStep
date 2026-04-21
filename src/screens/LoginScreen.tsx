import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Colors, Radius, FontSizes, Spacing } from '../../constants/theme';
import { supabase } from '../lib/supabase';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) Alert.alert('Login Failed', error.message);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.logoSection}>
          <Text style={styles.bolt}>⚡</Text>
          <Text style={styles.logoText}>
            <Text style={{ color: Colors.text }}>My</Text>
            <Text style={{ color: Colors.primary }}>Step</Text>
          </Text>
          <Text style={styles.tagline}>MOVE TOGETHER. WIN TOGETHER.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to continue tracking</Text>

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="Your password"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.buttonText}>Sign In →</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.link}
          >
            <Text style={styles.linkText}>
              New here? <Text style={{ color: Colors.primary }}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
  logoSection: { alignItems: 'center', marginBottom: 28 },
  bolt: { fontSize: 44 },
  logoText: { fontSize: 38, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  tagline: { color: Colors.textMuted, fontSize: 11, letterSpacing: 2.5, marginTop: 6 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: 24, borderWidth: 0.5, borderColor: Colors.border,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: Colors.textMuted, marginBottom: 20 },
  label: {
    fontSize: 11, fontWeight: '600', color: Colors.textMuted,
    letterSpacing: 1, marginBottom: 6, marginTop: 14,
  },
  input: {
    backgroundColor: Colors.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    color: Colors.text, fontSize: 15,
  },
  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  buttonText: { color: '#000', fontWeight: '700', fontSize: 17 },
  link: { alignItems: 'center', marginTop: 16 },
  linkText: { color: Colors.textMuted, fontSize: 13 },
});