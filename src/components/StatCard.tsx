import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '../../constants/theme';

interface StatCardProps {
  emoji: string;
  value: string | number;
  unit: string;
  label: string;
  color: string;
  progress?: number; // 0-1
  style?: any;
}

export function StatCard({ emoji, value, unit, label, color, progress, style }: StatCardProps) {
  return (
    <View style={[styles.card, { borderColor: color + '55' }, style]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.unit}>{unit}</Text>
      <Text style={styles.label}>{label}</Text>
      {progress !== undefined && (
        <View style={[styles.barBg, { backgroundColor: color + '25' }]}>
          <View style={[styles.barFill, { backgroundColor: color, width: `${Math.min(100, Math.round(progress * 100))}%` }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
  },
  emoji: { fontSize: 20 },
  value: { fontSize: 26, fontWeight: '700', marginTop: 6 },
  unit: { fontSize: 12, color: Colors.textMuted },
  label: { fontSize: 13, color: Colors.textMuted, marginTop: 2, marginBottom: 10 },
  barBg: { borderRadius: 3, height: 5 },
  barFill: { height: 5, borderRadius: 3 },
});
