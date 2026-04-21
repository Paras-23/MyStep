// 
import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  Animated, TouchableWithoutFeedback,
} from 'react-native';
import { Colors, Radius } from '../../constants/theme';
import { Avatar } from './Avatar';

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  name: string;
  email?: string;
  avatarUrl?: string;  // ← Google profile picture
}

export function ProfileSheet({ visible, onClose, onLogout, name, email, avatarUrl }: ProfileSheetProps) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 400, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 0,   duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />

        {/* Profile header */}
        <View style={styles.profileHeader}>
          <Avatar name={name} size={56} color={Colors.primary} avatarUrl={avatarUrl} />
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={styles.profileName}>{name}</Text>
            {email ? <Text style={styles.profileEmail}>{email}</Text> : null}
            <View style={styles.memberBadge}>
              <Text style={styles.memberBadgeText}>⚡ MyStep Member</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* About section */}
        <View style={styles.menuItem}>
          <Text style={styles.menuIcon}>ℹ️</Text>
          <Text style={styles.menuLabel}>About MyStep</Text>
        </View>

        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>EY Marathon Challenge</Text>
          <Text style={styles.aboutText}>
            MyStep is developed exclusively for EY personnel participating in the EY Marathon Challenge.
            {'\n\n'}
            This app tracks your daily step count, monitors team performance, and ranks participants across all EY teams competing in the marathon.
            {'\n\n'}
            Your steps are synced in real time and contribute to your team's total on the leaderboard. Form a team of up to 4 EY colleagues, track your collective progress, and push each other to hit the 10,000 steps daily goal.
            {'\n\n'}
            🏃 Move Together. Win Together.
          </Text>
          <View style={styles.aboutFooter}>
            <Text style={styles.aboutVersion}>Version 1.0.0  ·  EY Internal Use Only</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => { onClose(); setTimeout(onLogout, 300); }}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:       { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:          { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12 },
  handle:         { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  profileHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  profileName:    { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  profileEmail:   { fontSize: 13, color: Colors.textMuted, marginBottom: 6 },
  memberBadge:    { backgroundColor: Colors.primary + '22', borderRadius: 6, borderWidth: 1, borderColor: Colors.primary + '55', paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  memberBadgeText:{ fontSize: 11, color: Colors.primary, fontWeight: '600' },
  divider:        { height: 0.5, backgroundColor: Colors.border, marginVertical: 12 },
  menuItem:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  menuIcon:       { fontSize: 20 },
  menuLabel:      { fontSize: 16, fontWeight: '500', color: Colors.text },
  aboutCard:      { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: 16, borderWidth: 0.5, borderColor: Colors.border, marginBottom: 4 },
  aboutTitle:     { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 8, letterSpacing: 0.5 },
  aboutText:      { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  aboutFooter:    { marginTop: 12, paddingTop: 10, borderTopWidth: 0.5, borderColor: Colors.border },
  aboutVersion:   { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
  logoutBtn:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4 },
  logoutIcon:     { fontSize: 20 },
  logoutText:     { fontSize: 16, fontWeight: '600', color: Colors.error },
});
