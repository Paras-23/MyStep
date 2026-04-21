// 

import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import { supabase } from '../lib/supabase';

function firstName(name: string) { return name.split(' ')[0]; }

export default function ConnectScreen() {
  const { profile } = useAuth();
  const [myTeam,       setMyTeam]       = useState<any>(null);
  const [search,       setSearch]       = useState('');
  const [searchResults,setSearchResults]= useState<any[]>([]);
  const [allUsers,     setAllUsers]     = useState<any[]>([]);
  const [refreshing,   setRefreshing]   = useState(false);

  const [createModal,  setCreateModal]  = useState(false);
  const [joinModal,    setJoinModal]    = useState(false);
  const [newTeamName,  setNewTeamName]  = useState('');
  const [joinCode,     setJoinCode]     = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile?.id) return;

    // Check if user is in a team
    const { data: membership } = await supabase
      .from('team_members')
      .select(`
        team_id,
        teams(id, name, invite_code,
          team_members(user_id, users(full_name, avatar_color))
        )
      `)
      .eq('user_id', profile.id)
      .maybeSingle();

    setMyTeam(membership ? (membership as any).teams : null);

    // All other users for "People you may know"
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, avatar_color')
      .neq('id', profile.id)
      .limit(15);
    setAllUsers(users || []);
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const handleSearch = async (text: string) => {
    setSearch(text);
    if (text.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('users')
      .select('id, full_name, avatar_color')
      .ilike('full_name', `%${text}%`)
      .neq('id', profile?.id)
      .limit(10);
    setSearchResults(data || []);
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) { Alert.alert('Error', 'Please enter a team name'); return; }
    if (myTeam) { Alert.alert('Already in a team', 'Leave your current team first.'); return; }
    setModalLoading(true);
    try {
      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .insert({ name: newTeamName.trim(), created_by: profile?.id })
        .select()
        .single();
      if (teamErr) throw teamErr;

      const { error: memberErr } = await supabase
        .from('team_members')
        .insert({ team_id: team.id, user_id: profile?.id });
      if (memberErr) throw memberErr;

      setCreateModal(false);
      setNewTeamName('');
      await fetchData();
      Alert.alert(
        '🎉 Team Created!',
        `Your team "${team.name}" is ready!\n\nInvite code: ${team.invite_code}\n\nShare this code with up to 3 friends so they can join.`,
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create team');
    } finally { setModalLoading(false); }
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) { Alert.alert('Error', 'Enter the invite code'); return; }
    if (myTeam) { Alert.alert('Already in a team', 'Leave your current team first.'); return; }
    setModalLoading(true);
    try {
      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .select('id, name')
        .eq('invite_code', joinCode.trim().toUpperCase())
        .single();
      if (teamErr || !team) throw new Error('Team not found. Check the code and try again.');

      const { error: memberErr } = await supabase
        .from('team_members')
        .insert({ team_id: team.id, user_id: profile?.id });
      if (memberErr) throw memberErr;

      setJoinModal(false);
      setJoinCode('');
      await fetchData();
      Alert.alert('🎉 Joined!', `You are now a member of "${team.name}"`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to join team');
    } finally { setModalLoading(false); }
  };

  const handleLeaveTeam = () => {
    Alert.alert(
      'Leave Team',
      `Are you sure you want to leave ${myTeam?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave', style: 'destructive', onPress: async () => {
            await supabase.from('team_members')
              .delete()
              .eq('user_id', profile?.id)
              .eq('team_id', myTeam?.id);
            setMyTeam(null);
            await fetchData();
          },
        },
      ],
    );
  };

  const displayUsers = search.length >= 2 ? searchResults : allUsers;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
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
        {profile && <Avatar name={profile.full_name} size={38} color={Colors.primary} />}
      </View>

      <Text style={styles.title}>Connect</Text>
      <Text style={styles.subtitle}>Build your team & find friends</Text>

      {/* ── Search ── */}
      <TextInput
        style={styles.search}
        placeholder="🔍  Search by name..."
        placeholderTextColor={Colors.textMuted}
        value={search}
        onChangeText={handleSearch}
      />

      {/* ── Team section ── */}
      {myTeam ? (
        /* User HAS a team */
        <View style={styles.teamCard}>
          <Text style={styles.sectionLabel}>YOUR TEAM</Text>
          <View style={styles.teamRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.teamName}>{myTeam.name} ⚡</Text>
              <Text style={styles.teamMeta}>
                {myTeam.team_members?.length || 1} member{(myTeam.team_members?.length || 1) !== 1 ? 's' : ''}
                {(myTeam.team_members?.length || 1) < 4
                  ? ` · ${4 - (myTeam.team_members?.length || 1)} spot${4 - (myTeam.team_members?.length || 1) !== 1 ? 's' : ''} left`
                  : ' · Full'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.inviteBtn}
              onPress={() => Alert.alert(
                '📣 Invite Code',
                `Share this code with friends:\n\n${myTeam.invite_code}\n\nThey can join from the Connect tab → "Enter Code"`,
              )}
            >
              <Text style={styles.inviteBtnText}>+ Invite</Text>
            </TouchableOpacity>
          </View>

          {/* Team members */}
          {(myTeam.team_members || []).map((tm: any) => (
            <View key={tm.user_id} style={styles.memberRow}>
              <Avatar name={tm.users?.full_name || '?'} size={34} color={Colors.primary} />
              <Text style={[styles.memberName, { marginLeft: 10 }]}>
                {tm.user_id === profile?.id ? 'You' : firstName(tm.users?.full_name || '?')}
              </Text>
            </View>
          ))}

          <TouchableOpacity onPress={handleLeaveTeam} style={styles.leaveBtn}>
            <Text style={styles.leaveBtnText}>Leave team</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* User has NO team */
        <View style={styles.noTeamCard}>
          <Text style={styles.noTeamTitle}>You're not in a team</Text>
          <Text style={styles.noTeamSub}>
            Create a new team (max 4 members) or join one with an invite code.
          </Text>
          <View style={styles.teamActions}>
            <TouchableOpacity style={styles.createBtn} onPress={() => setCreateModal(true)}>
              <Text style={styles.createBtnText}>+ Create Team</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.joinBtn} onPress={() => setJoinModal(true)}>
              <Text style={styles.joinBtnText}>Enter Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── People you may know ── */}
      {displayUsers.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 20, marginBottom: 10 }]}>
            {search.length >= 2 ? 'SEARCH RESULTS' : 'PEOPLE YOU MAY KNOW'}
          </Text>
          {displayUsers.map((u: any) => (
            <View key={u.id} style={styles.personRow}>
              <Avatar name={u.full_name} size={44} color={u.avatar_color || Colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.personName}>{firstName(u.full_name)}</Text>
                <Text style={styles.personSub}>MyStep member</Text>
              </View>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 40 }} />

      {/* ── Create Team Modal ── */}
      <Modal visible={createModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create a Team</Text>
            <Text style={styles.modalSub}>Max 4 members · You'll get an invite code to share</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Team name (e.g. Thunder Wolves)"
              placeholderTextColor={Colors.textMuted}
              value={newTeamName}
              onChangeText={setNewTeamName}
              autoFocus
              maxLength={30}
            />
            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={handleCreateTeam}
              disabled={modalLoading}
            >
              {modalLoading
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.modalPrimaryBtnText}>Create Team</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSecondaryBtn}
              onPress={() => { setCreateModal(false); setNewTeamName(''); }}
            >
              <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Join Team Modal ── */}
      <Modal visible={joinModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Join a Team</Text>
            <Text style={styles.modalSub}>Enter the 6-character invite code from your teammate</Text>
            <TextInput
              style={[styles.modalInput, { textTransform: 'uppercase', letterSpacing: 6, textAlign: 'center', fontSize: 20 }]}
              placeholder="ABC123"
              placeholderTextColor={Colors.textMuted}
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              maxLength={6}
              autoFocus
            />
            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={handleJoinTeam}
              disabled={modalLoading}
            >
              {modalLoading
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.modalPrimaryBtnText}>Join Team</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSecondaryBtn}
              onPress={() => { setJoinModal(false); setJoinCode(''); }}
            >
              <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.lg },
  header:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 56, marginBottom: 14 },
  headerLeft:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bolt:                { fontSize: 20 },
  headerGreet:         { fontSize: 20, fontWeight: '600', color: Colors.text },
  title:               { fontSize: 28, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  subtitle:            { fontSize: 13, color: Colors.textMuted, marginBottom: 16 },
  search:              { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, color: Colors.text, fontSize: 15, marginBottom: 16, borderWidth: 0.5, borderColor: Colors.border },
  sectionLabel:        { fontSize: 10, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 8 },

  teamCard:            { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: Colors.teamPurple + '55' },
  teamRow:             { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  teamName:            { fontSize: 16, fontWeight: '700', color: Colors.text },
  teamMeta:            { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  inviteBtn:           { backgroundColor: Colors.teamPurple, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 10 },
  inviteBtnText:       { color: '#fff', fontWeight: '700', fontSize: 14 },
  memberRow:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 0.5, borderColor: Colors.border },
  memberName:          { color: Colors.text, fontSize: 14, fontWeight: '500' },
  leaveBtn:            { marginTop: 12, alignItems: 'center' },
  leaveBtnText:        { color: Colors.error, fontSize: 13 },

  noTeamCard:          { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 24, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.border, marginBottom: 8 },
  noTeamTitle:         { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  noTeamSub:           { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  teamActions:         { flexDirection: 'row', gap: 10, width: '100%' },
  createBtn:           { flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  createBtnText:       { color: '#000', fontWeight: '700', fontSize: 15 },
  joinBtn:             { flex: 1, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary },
  joinBtnText:         { color: Colors.primary, fontWeight: '700', fontSize: 15 },

  personRow:           { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: Colors.border },
  personName:          { color: Colors.text, fontSize: 15, fontWeight: '600' },
  personSub:           { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  modalOverlay:        { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  modalCard:           { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 48 },
  modalTitle:          { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  modalSub:            { fontSize: 13, color: Colors.textMuted, marginBottom: 20 },
  modalInput:          { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 14, color: Colors.text, fontSize: 16, marginBottom: 16 },
  modalPrimaryBtn:     { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  modalPrimaryBtnText: { color: '#000', fontWeight: '700', fontSize: 16 },
  modalSecondaryBtn:   { alignItems: 'center', paddingVertical: 10 },
  modalSecondaryBtnText: { color: Colors.textMuted, fontSize: 14 },
});
