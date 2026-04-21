// 
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import { supabase } from '../lib/supabase';

const RANK_COLORS = [Colors.gold, Colors.silver, Colors.bronze];
const RANK_EMOJI  = ['🥇', '🥈', '🥉'];
const TEAM_COLORS = [Colors.primary, Colors.calories, Colors.teamPurple, Colors.success];

function firstName(name: string) { return name.split(' ')[0]; }

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [tab,         setTab]         = useState<'individual' | 'team'>('individual');
  const [individuals, setIndividuals] = useState<any[]>([]);
  const [teams,       setTeams]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  const fetchData = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];

    // ── Individual leaderboard — today's steps ─────────
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, avatar_color');

    const { data: todaySteps } = await supabase
      .from('daily_steps')
      .select('user_id, steps')
      .eq('step_date', today);

    const { data: memberships } = await supabase
      .from('team_members')
      .select('user_id, teams(name)');

    const stepsMap: Record<string, number> = {};
    (todaySteps || []).forEach((s: any) => { stepsMap[s.user_id] = s.steps; });

    const teamNameMap: Record<string, string> = {};
    (memberships || []).forEach((m: any) => {
      if (m.teams?.name) teamNameMap[m.user_id] = m.teams.name;
    });

    const individualList = (users || [])
      .map((u: any) => ({
        id:        u.id,
        full_name: u.full_name,
        color:     u.avatar_color || Colors.primary,
        steps:     stepsMap[u.id] || 0,
        team_name: teamNameMap[u.id] || null,
        isMe:      u.id === profile?.id,
      }))
      .sort((a: any, b: any) => b.steps - a.steps);

    setIndividuals(individualList);

    // ── Team leaderboard — TODAY's total steps only ────
    // BUG FIX: was summing multiple days, now only uses today's date
    // This ensures team total = exact sum of each member's steps today
    const { data: allTeams } = await supabase
      .from('teams')
      .select('id, name, team_members(user_id)');

    const teamList = (allTeams || [])
      .map((t: any) => {
        const memberIds = (t.team_members || []).map((m: any) => m.user_id);

        // Sum ONLY today's steps for each member
        // This is the exact same stepsMap used for individual leaderboard
        // so individual and team numbers will always be consistent
        const totalSteps = memberIds.reduce(
          (sum: number, uid: string) => sum + (stepsMap[uid] || 0),
          0
        );

        return {
          id:           t.id,
          name:         t.name,
          member_count: memberIds.length,
          total_steps:  totalSteps,
          member_ids:   memberIds,
          isMyTeam:     memberIds.includes(profile?.id),
        };
      })
      .sort((a: any, b: any) => b.total_steps - a.total_steps);

    setTeams(teamList);
    setLoading(false);
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const maxTeamSteps = Math.max(1, ...teams.map(t => t.total_steps));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading rankings...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top || 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.bolt}>⚡</Text>
          <Text style={styles.headerGreet}>
            Hi, <Text style={{ color: Colors.primary }}>
              {profile ? firstName(profile.full_name) : '...'}
            </Text>
          </Text>
        </View>
        {profile && (
          <Avatar
            name={profile.full_name}
            size={38}
            color={Colors.primary}
            avatarUrl={(profile as any).avatar_url}
          />
        )}
      </View>

      <Text style={styles.title}>Leaderboard</Text>
      <Text style={styles.subtitle}>
        {tab === 'individual' ? "Today's step rankings" : "Today's team standings"}
      </Text>

      {/* ── Tab switcher ── */}
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

      {/* ── Individual Rankings ── */}
      {tab === 'individual' && (
        individuals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>👟</Text>
            <Text style={styles.emptyTitle}>No steps recorded today</Text>
            <Text style={styles.emptyText}>Start walking to appear on the leaderboard!</Text>
          </View>
        ) : (
          individuals.map((p, idx) => (
            <View
              key={p.id}
              style={[
                styles.row,
                idx === 0 && { borderColor: Colors.gold + '80' },
                p.isMe && idx !== 0 && { borderColor: Colors.primary + '60' },
              ]}
            >
              <Text style={styles.rankText}>
                {idx < 3 ? RANK_EMOJI[idx] : `#${idx + 1}`}
              </Text>
              <Avatar
                name={p.full_name}
                size={40}
                color={idx < 3 ? RANK_COLORS[idx] : (p.isMe ? Colors.primary : Colors.textMuted)}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.memberName}>
                  {p.isMe ? `You (${firstName(p.full_name)})` : firstName(p.full_name)}
                </Text>
                {p.team_name && <Text style={styles.memberSub}>{p.team_name}</Text>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[
                  styles.stepsText,
                  { color: idx < 3 ? RANK_COLORS[idx] : (p.isMe ? Colors.primary : Colors.textSecondary) },
                ]}>
                  {p.steps.toLocaleString()}
                </Text>
                <Text style={styles.stepsLabel}>steps</Text>
              </View>
            </View>
          ))
        )
      )}

      {/* ── Team Rankings ── */}
      {tab === 'team' && (
        teams.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No teams yet</Text>
            <Text style={styles.emptyText}>Create or join a team in the Connect tab!</Text>
          </View>
        ) : (
          teams.map((t, idx) => {
            const barColor   = TEAM_COLORS[idx % TEAM_COLORS.length];
            const barPercent = Math.round((t.total_steps / maxTeamSteps) * 100);
            return (
              <View
                key={t.id}
                style={[
                  styles.teamRow,
                  idx === 0 && { borderColor: Colors.gold + '80' },
                  t.isMyTeam && idx !== 0 && { borderColor: Colors.primary + '60' },
                ]}
              >
                <View style={styles.teamRowTop}>
                  <Text style={styles.rankText}>
                    {idx < 3 ? RANK_EMOJI[idx] : `#${idx + 1}`}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>
                      {t.name}
                      {t.isMyTeam && <Text style={{ color: Colors.primary }}> ⚡</Text>}
                    </Text>
                    <Text style={styles.memberSub}>
                      {t.member_count} member{t.member_count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.stepsText, { color: barColor }]}>
                      {t.total_steps.toLocaleString()}
                    </Text>
                    <Text style={styles.stepsLabel}>total steps today</Text>
                  </View>
                </View>
                <View style={styles.teamBarBg}>
                  <View style={[styles.teamBarFill, {
                    width: `${barPercent}%`,
                    backgroundColor: barColor,
                  }]} />
                </View>
              </View>
            );
          })
        )
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.lg },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:      { color: Colors.textMuted, fontSize: 14 },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginBottom: 14 },
  headerLeft:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bolt:             { fontSize: 20 },
  headerGreet:      { fontSize: 20, fontWeight: '600', color: Colors.text },
  title:            { fontSize: 28, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  subtitle:         { fontSize: 13, color: Colors.textMuted, marginBottom: 16 },
  tabBar:           { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 4, marginBottom: 16, borderWidth: 0.5, borderColor: Colors.border },
  tab:              { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.md },
  tabActive:        { backgroundColor: Colors.primary },
  tabText:          { fontSize: 14, color: Colors.textMuted, fontWeight: '500' },
  tabTextActive:    { color: '#000', fontWeight: '700' },
  row:              { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  rankText:         { fontSize: 18, minWidth: 34, textAlign: 'center' },
  memberName:       { color: Colors.text, fontSize: 15, fontWeight: '600' },
  memberSub:        { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
  stepsText:        { fontSize: 18, fontWeight: '700' },
  stepsLabel:       { fontSize: 11, color: Colors.textMuted },
  teamRow:          { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  teamRowTop:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  teamBarBg:        { backgroundColor: Colors.border, borderRadius: 4, height: 7 },
  teamBarFill:      { height: 7, borderRadius: 4 },
  emptyCard:        { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 36, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.border },
  emptyEmoji:       { fontSize: 40, marginBottom: 12 },
  emptyTitle:       { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  emptyText:        { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
});
