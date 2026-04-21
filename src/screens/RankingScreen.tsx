import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

const individualData = [
  { rank: 1, initials: 'JL', name: 'Jordan Lee', team: 'Thunder Wolves', steps: 14820 },
  { rank: 2, initials: 'SR', name: 'Sam Rivera', team: 'Iron Foxes', steps: 13540 },
  { rank: 3, initials: 'AK', name: 'Alex Kim', team: 'Thunder Wolves', steps: 12100 },
  { rank: 4, initials: 'MC', name: 'Morgan Chen', team: 'Steel Hawks', steps: 11700 },
  { rank: 5, initials: 'TM', name: 'Taylor Moss', team: 'Iron Foxes', steps: 10350 },
  { rank: 6, initials: 'CW', name: 'Casey Wu', team: 'Steel Hawks', steps: 9800 },
];

const teamData = [
  { rank: 1, name: 'Thunder Wolves', members: 2, steps: 26920, color: Colors.primary },
  { rank: 2, name: 'Iron Foxes', members: 2, steps: 23890, color: Colors.calories },
  { rank: 3, name: 'Steel Hawks', members: 2, steps: 21500, color: Colors.teamPurple },
];

const rankEmoji = ['🥇', '🥈', '🥉'];
const maxTeamSteps = Math.max(...teamData.map(t => t.steps));

export default function RankingScreen() {
  const [tab, setTab] = useState<'individual' | 'team'>('individual');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerBolt}>⚡</Text>
          <Text style={styles.headerGreet}>
            Hi, <Text style={{ color: Colors.primary }}>Garav</Text>
          </Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>G</Text></View>
      </View>

      <Text style={styles.title}>Leaderboard</Text>
      <Text style={styles.subtitle}>This week's rankings</Text>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'individual' && styles.tabActive]}
          onPress={() => setTab('individual')}
        >
          <Text style={[styles.tabText, tab === 'individual' && styles.tabTextActive]}>
            👤 Individual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'team' && styles.tabActive]}
          onPress={() => setTab('team')}
        >
          <Text style={[styles.tabText, tab === 'team' && styles.tabTextActive]}>
            👥 Team
          </Text>
        </TouchableOpacity>
      </View>

      {/* Individual */}
      {tab === 'individual' && individualData.map((p) => (
        <View key={p.rank} style={[styles.row, p.rank === 1 && styles.rowFirst]}>
          <Text style={styles.rankEmoji}>
            {p.rank <= 3 ? rankEmoji[p.rank - 1] : `#${p.rank}`}
          </Text>
          <View style={styles.memberAvatar}>
            <Text style={styles.memberInitials}>{p.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{p.name}</Text>
            <Text style={styles.memberTeam}>{p.team}</Text>
          </View>
          <View>
            <Text style={[styles.steps, { color: p.rank <= 3 ? Colors.gold : Colors.primary }]}>
              {p.steps.toLocaleString()}
            </Text>
            <Text style={styles.stepsLabel}>steps</Text>
          </View>
        </View>
      ))}

      {/* Team */}
      {tab === 'team' && teamData.map((t) => (
        <View key={t.rank} style={styles.teamRow}>
          <View style={styles.teamRowTop}>
            <Text style={styles.rankEmoji}>{rankEmoji[t.rank - 1]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{t.name}</Text>
              <Text style={styles.memberTeam}>{t.members} members</Text>
            </View>
            <View>
              <Text style={[styles.steps, { color: t.color }]}>{t.steps.toLocaleString()}</Text>
              <Text style={styles.stepsLabel}>total steps</Text>
            </View>
          </View>
          <View style={styles.teamProgressBg}>
            <View style={[styles.teamProgressFill, {
              width: `${Math.round((t.steps / maxTeamSteps) * 100)}%`,
              backgroundColor: t.color,
            }]} />
          </View>
        </View>
      ))}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 56, marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBolt: { fontSize: 20 },
  headerGreet: { fontSize: 20, fontWeight: '600', color: Colors.text },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#000', fontWeight: '700', fontSize: 16 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 18 },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, padding: 4, marginBottom: 16, borderWidth: 0.5, borderColor: Colors.border },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 14, color: Colors.textMuted, fontWeight: '500' },
  tabTextActive: { color: '#000', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: Colors.border },
  rowFirst: { borderColor: Colors.gold },
  rankEmoji: { fontSize: 20, minWidth: 28, textAlign: 'center' },
  memberAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  memberInitials: { color: '#000', fontWeight: '700', fontSize: 13 },
  memberName: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  memberTeam: { color: Colors.textMuted, fontSize: 12 },
  steps: { fontSize: 18, fontWeight: '700', textAlign: 'right' },
  stepsLabel: { fontSize: 11, color: Colors.textMuted, textAlign: 'right' },
  teamRow: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: Colors.border },
  teamRowTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  teamProgressBg: { backgroundColor: Colors.border, borderRadius: 4, height: 6 },
  teamProgressFill: { height: 6, borderRadius: 4 },
});