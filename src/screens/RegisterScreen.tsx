import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, KeyboardAvoidingView,
  Platform, ActivityIndicator, Animated,
} from 'react-native';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { supabase } from '../lib/supabase';

export default function RegisterScreen({ navigation }: any) {
  const [fullName, setFullName]   = useState('');
  const [gpNumber, setGpNumber]   = useState('');
  const [phone, setPhone]         = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors]       = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Name is required';
    if (!gpNumber.trim()) e.gpNumber = 'GPN number is required';
    if (!phone.trim() || phone.replace(/\s/g,'').length < 10) e.phone = 'Enter a valid phone number';
    if (!email.trim() || !email.includes('@')) e.email = 'Enter a valid email';
    if (!password || password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    let createdUserId: string | null = null;

    try {
      // Check if email already has a profile (avoids duplicate error)
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .maybeSingle();

      // Step 1 — Sign up with Supabase auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          // Skip email confirmation completely
          data: {
            full_name: fullName.trim(),
          }
        }
      });

      if (signUpError) {
        // Handle rate limit gracefully
        if (signUpError.message.includes('rate limit') || 
            signUpError.message.includes('email rate')) {
          throw new Error(
            'Too many attempts with this email. Please use a different email address or wait 1 hour.'
          );
        }
        throw signUpError;
      }

      if (!data.user) throw new Error('Registration failed. Please try again.');
      createdUserId = data.user.id;

      // Step 2 — Insert profile row
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        full_name: fullName.trim(),
        gp_number: gpNumber.trim(),
        phone: phone.trim(),
        avatar_color: Colors.primary,
      });

      if (profileError) {
        // If profile already exists that's fine, just sign in
        if (!profileError.message.includes('duplicate')) {
          await supabase.auth.signOut();
          throw profileError;
        }
      }

      // Step 3 — Show success popup for 3 seconds then let AuthContext navigate
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        // AuthContext detects session and navigates automatically
      }, 3000);

    } catch (err: any) {
      if (createdUserId) await supabase.auth.signOut();
      Alert.alert('Registration Failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Success Toast ── */}
      {showSuccess && (
        <View style={styles.successToast}>
          <Text style={styles.successIcon}>✅</Text>
          <View>
            <Text style={styles.successTitle}>Successfully signed up!</Text>
            <Text style={styles.successSub}>Welcome to MyStep, {fullName.split(' ')[0]}!</Text>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <Text style={styles.bolt}>⚡</Text>
          <Text style={styles.logoText}>
            <Text style={{ color: Colors.text }}>My</Text>
            <Text style={{ color: Colors.primary }}>Step</Text>
          </Text>
          <Text style={styles.tagline}>MOVE TOGETHER. WIN TOGETHER.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create your account</Text>
          <Text style={styles.cardSubtitle}>Join your team and start tracking</Text>

          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            style={[styles.input, errors.fullName ? styles.inputError : null]}
            placeholder="Your full name"
            placeholderTextColor={Colors.textMuted}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
          {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}

          <Text style={styles.label}>GPN NUMBER</Text>
          <TextInput
            style={[styles.input, errors.gpNumber ? styles.inputError : null]}
            placeholder="Your GPN number"
            placeholderTextColor={Colors.textMuted}
            value={gpNumber}
            onChangeText={setGpNumber}
          />
          {errors.gpNumber ? <Text style={styles.errorText}>{errors.gpNumber}</Text> : null}

          <Text style={styles.label}>PHONE NUMBER</Text>
          <TextInput
            style={[styles.input, errors.phone ? styles.inputError : null]}
            placeholder="+44 7700 900000"
            placeholderTextColor={Colors.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={[styles.input, errors.password ? styles.inputError : null]}
            placeholder="Min 6 characters"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.buttonText}>Create Account →</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkText}>
              Already have an account?{' '}
              <Text style={{ color: Colors.primary }}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  scroll:         { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
  logoSection:    { alignItems: 'center', marginBottom: 28 },
  bolt:           { fontSize: 44 },
  logoText:       { fontSize: 38, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  tagline:        { color: Colors.textMuted, fontSize: 11, letterSpacing: 2.5, marginTop: 6 },
  card:           { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 24, borderWidth: 0.5, borderColor: Colors.border },
  cardTitle:      { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  cardSubtitle:   { fontSize: 13, color: Colors.textMuted, marginBottom: 20 },
  label:          { fontSize: 11, fontWeight: '600', color: Colors.textMuted, letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  input:          { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 14, color: Colors.text, fontSize: 15 },
  inputError:     { borderColor: Colors.error },
  errorText:      { color: Colors.error, fontSize: 12, marginTop: 4, marginBottom: 4 },
  button:         { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  buttonText:     { color: '#000', fontWeight: '700', fontSize: 16 },
  loginLink:      { alignItems: 'center', marginTop: 16 },
  loginLinkText:  { color: Colors.textMuted, fontSize: 13 },

  // Success toast
  successToast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: Colors.success,
    borderRadius: Radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  successIcon:    { fontSize: 28 },
  successTitle:   { color: '#fff', fontWeight: '700', fontSize: 16 },
  successSub:     { color: '#fff', fontSize: 13, opacity: 0.9, marginTop: 2 },
});