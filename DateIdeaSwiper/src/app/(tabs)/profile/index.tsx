import { View, Text, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";
import { captureAppError } from "../../../lib/captureAppError";
import { clearOnboardingComplete } from "../../../lib/onboarding";
import { type Href, router, useFocusEffect } from "expo-router";
import ConfirmDialog from "../../../components/ConfirmDialog";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [partner, setPartner] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [matchesCount, setMatchesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resetDialogVisible, setResetDialogVisible] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDoneVisible, setResetDoneVisible] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unlinkDialogVisible, setUnlinkDialogVisible] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        return;
      }

      setUserEmail(user.email ?? null);

      // find couple record
      const { data: couple } = await supabase
        .from("couples")
        .select("*")
        .or(`user1.eq.${user.id},user2.eq.${user.id}`)
        .single();

      if (couple) {
        setCoupleId(couple.id);

        const partnerId =
          couple.user1 === user.id ? couple.user2 : couple.user1;

        if (partnerId) {
          setPartner("Linked");
        } else {
          setPartner(null);
        }
      } else {
        setPartner(null);
        setCoupleId(null);
      }

      const { count: likesTotal } = await supabase
        .from("swipes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("liked", true);

      setLikesCount(likesTotal ?? 0);

      if (couple?.id) {
        const { count: matchesTotal } = await supabase
          .from("matches")
          .select("*", { count: "exact", head: true })
          .eq("couple_id", couple.id);

        setMatchesCount(matchesTotal ?? 0);
      } else {
        setMatchesCount(0);
      }
    } catch (error) {
      captureAppError(error, { op: "loadProfile", screen: "profile" });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  async function unlinkPartner() {
    if (!coupleId) return;

    if (unlinking) return;
    setUnlinking(true);
    try {
      const { error } = await supabase.from("couples").delete().eq("id", coupleId);
      if (error) {
        captureAppError(error, { op: "unlinkPartner", screen: "profile", coupleId });
        return;
      }
      setPartner(null);
      setCoupleId(null);
      setUnlinkDialogVisible(false);
      loadProfile();
    } finally {
      setUnlinking(false);
    }
  }

  async function resetSwipes() {
    if (resetting) return;
    setResetting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      setLikesCount(0);
      setMatchesCount(0);
      await AsyncStorage.removeItem("matchModalDisabled");

      const { data: couple } = await supabase
        .from("couples")
        .select("*")
        .or(`user1.eq.${user.id},user2.eq.${user.id}`)
        .single();

      const partnerId =
        couple?.user1 === user.id ? couple.user2 : couple?.user1 ?? null;

      await supabase.from("swipes").delete().eq("user_id", user.id);

      if (couple?.id) {
        await supabase.from("matches").delete().eq("couple_id", couple.id);
      }

      if (couple?.id && partnerId) {
        const { data: swipeData } = await supabase
          .from("swipes")
          .select("date_id, user_id")
          .in("user_id", [user.id, partnerId])
          .eq("liked", true);

        if (swipeData) {
          const likedByDate = new Map<string, Set<string>>();

          swipeData.forEach((row) => {
            const dateId = String(row.date_id);
            const userId = String(row.user_id);

            if (!likedByDate.has(dateId)) {
              likedByDate.set(dateId, new Set());
            }

            likedByDate.get(dateId)?.add(userId);
          });

          for (const [dateId, users] of likedByDate.entries()) {
            if (users.size >= 2) {
              await supabase.from("matches").insert({
                couple_id: couple.id,
                date_id: dateId,
              });
            }
          }
        }
      }

      setResetDialogVisible(false);
      setResetDoneVisible(true);
      loadProfile();
    } catch (error) {
      captureAppError(error, { op: "resetSwipes", screen: "profile" });
    } finally {
      setResetting(false);
    }
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) captureAppError(error, { op: "signOut", screen: "profile" });
      setLogoutDialogVisible(false);
      await clearOnboardingComplete();
      router.replace("/onboarding" as Href);
    } finally {
      setLoggingOut(false);
    }
  }

  function confirmUnlink() {
    setUnlinkDialogVisible(true);
  }

  function confirmReset() {
    setResetDialogVisible(true);
  }

  function confirmLogout() {
    setLogoutDialogVisible(true);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <LinearGradient
      colors={["#fb7185", "#fff1f2", "#fff1f2"]}
      locations={[0, 0.28, 1]}
      style={styles.page}
    >
      <View style={styles.heroBackground} />
      <View style={styles.bottomGlow} />
      <View
        style={[
          styles.pageInner,
          {
            paddingTop: insets.top + 12,
            paddingBottom: Math.max(insets.bottom, 16) + 16,
          },
        ]}
      >
        <View style={styles.card}>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(userEmail ?? "?").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.heartPill}>
              <Text style={styles.heart}>❤</Text>
              <Text style={styles.heartPillText}>Profile</Text>
            </View>
            <Text style={styles.email}>{userEmail ?? "Unknown user"}</Text>
          </View>

          <View style={styles.partnerSection}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.label}>Partner status</Text>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>
                    {partner ?? "Not linked"}
                  </Text>
                </View>
              </View>
              {!partner ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => router.push("../profile/link")}
                >
                  <Text style={styles.primaryButtonText}>Link Partner</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    styles.dangerButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={confirmUnlink}
                >
                  <Text style={styles.dangerButtonText}>Unlink</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.contentLower}>
            <View style={styles.statsBlock}>
              <Text style={styles.label}>Your stats</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{likesCount}</Text>
                  <Text style={styles.statLabel}>Likes</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{matchesCount}</Text>
                  <Text style={styles.statLabel}>Matches</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionsSection}>
              <Text style={[styles.label, styles.actionsLabel]}>Actions</Text>
              <View style={styles.actionsStack}>
                <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={confirmReset}
              >
                <Text style={styles.secondaryButtonText}>Reset Swipes</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => router.push("/settings")}
              >
                <Text style={styles.secondaryButtonText}>Settings</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.dangerButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={confirmLogout}
              >
                <Text style={styles.dangerButtonText}>Log Out</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
      <ConfirmDialog
        visible={resetDialogVisible}
        title="Reset swipes?"
        message="This will clear your swipes and refresh matches for your partner."
        cancelText="Cancel"
        confirmText="Reset"
        destructive
        loading={resetting}
        onCancel={() => setResetDialogVisible(false)}
        onConfirm={resetSwipes}
      />
      <ConfirmDialog
        visible={resetDoneVisible}
        title="Swipes reset"
        message="You can start swiping again."
        cancelText="Close"
        confirmText="OK"
        destructive
        loading={false}
        onCancel={() => setResetDoneVisible(false)}
        onConfirm={() => setResetDoneVisible(false)}
      />
      <ConfirmDialog
        visible={logoutDialogVisible}
        title="Log out?"
        message="You will need to sign in again."
        cancelText="Cancel"
        confirmText="Log out"
        destructive
        loading={loggingOut}
        onCancel={() => setLogoutDialogVisible(false)}
        onConfirm={logout}
      />
      <ConfirmDialog
        visible={unlinkDialogVisible}
        title="Unlink partner?"
        message="This will remove the link between you and your partner."
        cancelText="Cancel"
        confirmText="Unlink"
        destructive
        loading={unlinking}
        onCancel={() => setUnlinkDialogVisible(false)}
        onConfirm={unlinkPartner}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  heroBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    backgroundColor: "#f472b6",
    opacity: 0.2,
  },
  bottomGlow: {
    position: "absolute",
    left: -60,
    right: -60,
    bottom: -40,
    height: 220,
    backgroundColor: "#fda4af",
    opacity: 0.18,
    borderTopLeftRadius: 220,
    borderTopRightRadius: 220,
  },
  pageInner: {
    flex: 1,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    paddingHorizontal: 20,
  },
  card: {
    flex: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.18)",
    shadowColor: "#7f1d1d",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  hero: {
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.3)",
    gap: 8,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: "600",
    color: "#7f1d1d",
  },
  heartPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.16)",
  },
  heart: {
    fontSize: 14,
    color: "#e11d48",
  },
  heartPillText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#be123c",
    textTransform: "uppercase",
  },
  email: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  partnerSection: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  contentLower: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "flex-end",
    minHeight: 0,
  },
  statsBlock: {
    alignSelf: "stretch",
    paddingTop: 24,
  },
  actionsSection: {
    flexShrink: 0,
  },
  actionsLabel: {
    marginTop: 20,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#6b7280",
    marginBottom: 8,
  },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 13,
    color: "#1f2937",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.18)",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  actionsStack: {
    gap: 8,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderWidth: 1,
    borderColor: "#1d4ed8",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#e2e8f0",
    borderWidth: 1,
    borderColor: "#cbd5f5",
  },
  secondaryButtonText: {
    color: "#1f2937",
    fontWeight: "600",
  },
  dangerButton: {
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  dangerButtonText: {
    color: "#991b1b",
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});
