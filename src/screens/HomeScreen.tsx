import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Radius, Spacing } from "../../constants/theme";
import { Avatar } from "../components/Avatar";
import { ProfileSheet } from "../components/ProfileSheet";
import { useAuth } from "../context/AuthContext";
import { useStepCounter } from "../hooks/useStepCounter";
import { supabase } from "../lib/supabase";

const STEP_GOAL = 10000;
const CALORIE_GOAL = 500;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "GOOD MORNING ⛅";
  if (h < 17) return "GOOD AFTERNOON ☀️";
  return "GOOD EVENING 🌙";
}

function firstName(name: string) {
  return name.split(" ")[0];
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile, signOut, session } = useAuth();
  const {
    steps,
    calories,
    distanceKm,
    heartRate,
    isAvailable,
    permissionStatus,
    forceSync,
  } = useStepCounter();
  const [teamData, setTeamData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [profileSheet, setProfileSheet] = useState(false);

  // Pull Google avatar from session metadata
  const avatarUrl =
    session?.user?.user_metadata?.avatar_url ||
    session?.user?.user_metadata?.picture ||
    (profile as any)?.avatar_url ||
    undefined;

  const fetchTeam = useCallback(async () => {
    if (!profile?.id) return;

    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id, teams(id, name)")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (!membership) {
      setTeamData(null);
      return;
    }

    const teamId = (membership as any).team_id;
    const today = new Date().toISOString().split("T")[0];

    const { data: allMembers } = await supabase
      .from("team_members")
      .select("user_id, users(id, full_name, avatar_color)")
      .eq("team_id", teamId);

    const { data: stepsData } = await supabase
      .from("daily_steps")
      .select("user_id, steps")
      .eq("step_date", today)
      .in(
        "user_id",
        (allMembers || []).map((m: any) => m.user_id),
      );

    const stepsMap: Record<string, number> = {};
    (stepsData || []).forEach((s: any) => {
      stepsMap[s.user_id] = s.steps;
    });

    const enriched = (allMembers || [])
      .map((m: any) => ({
        user_id: m.user_id,
        full_name: m.users?.full_name || "Unknown",
        avatar_color: m.users?.avatar_color || Colors.primary,
        steps: m.user_id === profile.id ? steps : stepsMap[m.user_id] || 0,
        isMe: m.user_id === profile.id,
      }))
      .sort((a: any, b: any) => b.steps - a.steps);

    setTeamData({
      name: (membership as any).teams?.name || "My Team",
      members: enriched,
    });
  }, [profile?.id, steps]);

  useFocusEffect(
    useCallback(() => {
      fetchTeam();
    }, [fetchTeam]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await forceSync();
    await fetchTeam();
    setRefreshing(false);
  };

  const stepsProgress = Math.min(1, steps / STEP_GOAL);
  const caloriesProgress = Math.min(1, calories / CALORIE_GOAL);
  const activeMembers =
    teamData?.members?.filter((m: any) => m.steps > 0).length || 0;

  return (
    <>
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.bolt}>⚡</Text>
            <Text style={styles.greeting}>
              Hi,{" "}
              <Text style={{ color: Colors.primary }}>
                {profile ? firstName(profile.full_name) : "..."}
              </Text>
            </Text>
          </View>
          <TouchableOpacity onPress={() => setProfileSheet(true)}>
            {profile && (
              <Avatar
                name={profile.full_name}
                size={38}
                color={Colors.primary}
                avatarUrl={avatarUrl}
              />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.timeGreeting}>{getGreeting()}</Text>
        <Text style={styles.motiveLine}>
          Lets hit your{"\n"}
          <Text style={{ color: Colors.primary }}>goals today</Text>
        </Text>

        {/* Pedometer warnings */}
        {!isAvailable && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️{" "}
              {Platform.OS === "ios"
                ? "Enable Motion & Fitness in iPhone Settings → Privacy → Motion & Fitness"
                : "Pedometer unavailable — test on a real device"}
            </Text>
          </View>
        )}
        {isAvailable && permissionStatus === "denied" && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ Step counting permission denied. Go to Settings →{" "}
              {Platform.OS === "ios"
                ? "Privacy & Security → Motion & Fitness → turn on MyStep"
                : "Apps → Expo Go → Permissions → Physical Activity → Allow"}
            </Text>
          </View>
        )}

        {/* Steps Hero Card */}
        <View style={styles.stepsCard}>
          <View style={styles.stepsRow}>
            <View>
              <Text style={styles.stepsLabel}>STEPS TODAY</Text>
              <Text style={styles.stepsNumber}>{steps.toLocaleString()}</Text>
              <Text style={styles.stepsGoalText}>
                of {STEP_GOAL.toLocaleString()} goal
              </Text>
            </View>
            <Text style={{ fontSize: 40 }}>👟</Text>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={[styles.progressLabel, { color: Colors.primary }]}>
              {Math.round(stepsProgress * 100)}%
            </Text>
          </View>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(stepsProgress * 100)}%` },
              ]}
            />
          </View>
          <View style={styles.subStats}>
            <Text style={styles.subStat}>📏 {distanceKm.toFixed(2)} km</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.syncBtn}>
              <Text style={styles.syncBtnText}>↑ Sync</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Heart Rate & Calories */}
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              { borderColor: Colors.heartRate + "55", marginRight: 6 },
            ]}
          >
            <Text style={{ fontSize: 20 }}>❤️</Text>
            <Text style={[styles.statValue, { color: Colors.heartRate }]}>
              {heartRate}
            </Text>
            <Text style={styles.statUnit}>bpm</Text>
            <Text style={styles.statLabel}>Heart Rate</Text>
            <View
              style={[
                styles.barBg,
                { backgroundColor: Colors.heartRate + "25" },
              ]}
            >
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: Colors.heartRate,
                    width: `${Math.round(Math.min(100, ((heartRate - 60) / 60) * 100))}%`,
                  },
                ]}
              />
            </View>
          </View>
          <View
            style={[
              styles.statCard,
              { borderColor: Colors.calories + "55", marginLeft: 6 },
            ]}
          >
            <Text style={{ fontSize: 20 }}>🔥</Text>
            <Text style={[styles.statValue, { color: Colors.calories }]}>
              {calories.toLocaleString()}
            </Text>
            <Text style={styles.statUnit}>kcal</Text>
            <Text style={styles.statLabel}>Calories</Text>
            <View
              style={[
                styles.barBg,
                { backgroundColor: Colors.calories + "25" },
              ]}
            >
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: Colors.calories,
                    width: `${Math.round(caloriesProgress * 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Team section */}
        {teamData ? (
          <>
            <View
              style={[
                styles.statCardWide,
                { borderColor: Colors.teamPurple + "55" },
              ]}
            >
              <Text style={{ fontSize: 20 }}>👥</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: Colors.teamPurple, fontSize: 28 },
                ]}
              >
                {activeMembers}
                <Text style={{ fontSize: 16 }}>/{teamData.members.length}</Text>
              </Text>
              <Text style={styles.statUnit}>active today</Text>
              <Text style={styles.statLabel}>Team Tracking</Text>
              <View
                style={[
                  styles.barBg,
                  { backgroundColor: Colors.teamPurple + "25" },
                ]}
              >
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: Colors.teamPurple,
                      width: `${Math.round((activeMembers / Math.max(1, teamData.members.length)) * 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.teamCard}>
              <View style={styles.teamHeader}>
                <Text style={styles.teamName}>{teamData.name}</Text>
                <View style={styles.teamBadge}>
                  <Text style={styles.teamBadgeText}>YOUR TEAM</Text>
                </View>
              </View>
              {teamData.members.map((m: any) => (
                <View key={m.user_id} style={styles.memberRow}>
                  <Avatar
                    name={m.full_name}
                    size={38}
                    color={m.isMe ? Colors.primary : Colors.success}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.memberName}>
                      {m.isMe ? "You" : firstName(m.full_name)}
                    </Text>
                    <Text style={styles.memberSteps}>
                      {m.steps.toLocaleString()} steps
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.activeDot,
                      {
                        backgroundColor:
                          m.steps > 0 ? Colors.success : Colors.border,
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.noTeamCard}>
            <Text style={styles.noTeamEmoji}>👥</Text>
            <Text style={styles.noTeamTitle}>Youre not in a team yet</Text>
            <Text style={styles.noTeamSub}>
              Go to the Connect tab to create or join a team of up to 4 people
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <ProfileSheet
        visible={profileSheet}
        onClose={() => setProfileSheet(false)}
        onLogout={signOut}
        name={profile?.full_name || ""}
        email={session?.user?.email}
        avatarUrl={avatarUrl}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    marginBottom: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  bolt: { fontSize: 20 },
  greeting: { fontSize: 20, fontWeight: "600", color: Colors.text },
  timeGreeting: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  motiveLine: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
    lineHeight: 36,
    marginBottom: 18,
  },
  warningBanner: {
    backgroundColor: Colors.gold + "22",
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.gold + "44",
  },
  warningText: { color: Colors.gold, fontSize: 13, lineHeight: 20 },
  stepsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.primary + "40",
    marginBottom: 14,
  },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  stepsLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  stepsNumber: {
    fontSize: 52,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: -2,
  },
  stepsGoalText: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: { fontSize: 13, color: Colors.textMuted },
  progressBg: { backgroundColor: Colors.border, borderRadius: 4, height: 7 },
  progressFill: { backgroundColor: Colors.primary, height: 7, borderRadius: 4 },
  subStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  subStat: { color: Colors.textMuted, fontSize: 13 },
  syncBtn: {
    backgroundColor: Colors.primary + "22",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.primary + "55",
  },
  syncBtnText: { color: Colors.primary, fontSize: 12, fontWeight: "600" },
  statsRow: { flexDirection: "row", marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
  },
  statCardWide: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  statValue: { fontSize: 26, fontWeight: "700", marginTop: 6 },
  statUnit: { fontSize: 12, color: Colors.textMuted },
  statLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: 10,
  },
  barBg: { borderRadius: 3, height: 5 },
  barFill: { height: 5, borderRadius: 3 },
  teamCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  teamHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  teamName: { fontSize: 16, fontWeight: "700", color: Colors.text },
  teamBadge: {
    backgroundColor: Colors.primary + "22",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  teamBadgeText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  memberRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  memberName: { color: Colors.text, fontSize: 14, fontWeight: "500" },
  memberSteps: { color: Colors.textMuted, fontSize: 12 },
  activeDot: { width: 9, height: 9, borderRadius: 5 },
  noTeamCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 28,
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  noTeamEmoji: { fontSize: 36, marginBottom: 10 },
  noTeamTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 6,
  },
  noTeamSub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
