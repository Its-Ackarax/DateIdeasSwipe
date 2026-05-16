import { View, Text, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { captureAppError } from "../../../lib/captureAppError";
import { clearOnboardingComplete } from "../../../lib/onboarding";
import { type Href, router, useFocusEffect } from "expo-router";
import ConfirmDialog from "../../../components/ConfirmDialog";

export default function Profile() {
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
    <LinearGradient colors={["#fb7185", "#fff1f2"]} style={styles.page}>
      <View style={styles.heroBackground} />
      <View style={styles.bottomGlow} />
      <View style={styles.card}>
        <View style={styles.heroHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(userEmail ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Your Profile</Text>
            <Text style={styles.email}>{userEmail ?? "Unknown user"}</Text>
          </View>
          <Text style={styles.heart}>❤</Text>
        </View>

        <View style={styles.section}>
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

        <View style={styles.section}>
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

        <View style={styles.section}>
          <Text style={styles.label}>Actions</Text>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={confirmReset}
          >
            <Text style={styles.secondaryButtonText}>Reset Swipes</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.dangerButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={confirmLogout}
          >
            <Text style={styles.dangerButtonText}>Log Out</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.secondaryCard}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.secondaryButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.push("/settings")}
        >
          <Text style={styles.secondaryButtonText}>Settings</Text>
        </Pressable>
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
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 20,
    paddingTop: 56,
    paddingBottom: 40,
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
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    marginTop: 16,
  },
  secondaryCard: {
    width: "100%",
    maxWidth: 420,
    marginTop: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.3)",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#7f1d1d",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
    color: "#111827",
  },
  email: {
    fontSize: 14,
    color: "#6b7280",
  },
  heart: {
    fontSize: 20,
    color: "#be123c",
    marginLeft: 8,
  },
  section: {
    marginTop: 12,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
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
  sectionTitle: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#6b7280",
    marginBottom: 8,
    fontWeight: "600",
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
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
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