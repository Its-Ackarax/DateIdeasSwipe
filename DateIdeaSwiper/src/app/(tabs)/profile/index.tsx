import { View, Text, ActivityIndicator, Alert, Pressable, StyleSheet } from "react-native";
import { useCallback, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { router, useFocusEffect } from "expo-router";

export default function Profile() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [partner, setPartner] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [matchesCount, setMatchesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setLoading(false);
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
        // fetch partner email
        const { data: partnerUser } = await supabase.auth.admin.getUserById(
          partnerId
        );

        setPartner(partnerUser.user?.email ?? "Linked");
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

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  async function unlinkPartner() {
    if (!coupleId) return;

    await supabase.from("couples").delete().eq("id", coupleId);

    setPartner(null);
    setCoupleId(null);
    loadProfile();
  }

  async function resetSwipes() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

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

    alert("Swipes reset. You can start again.");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  }

  function confirmUnlink() {
    Alert.alert(
      "Unlink partner?",
      "This will remove the link between you and your partner.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Unlink", style: "destructive", onPress: unlinkPartner },
      ]
    );
  }

  function confirmReset() {
    Alert.alert(
      "Reset swipes?",
      "This will clear your swipes and refresh matches for your partner.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: resetSwipes },
      ]
    );
  }

  function confirmLogout() {
    Alert.alert("Log out?", "You will need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.page}>
      <View style={styles.heroBackground} />
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
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={confirmUnlink}
              >
                <Text style={styles.secondaryButtonText}>Unlink</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#fdf2f8",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  heroBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: "#7f1d1d",
    opacity: 0.45,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    shadowColor: "#111827",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
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
    backgroundColor: "#f1f5f9",
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
    color: "#1f2937",
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
  chip: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 13,
    color: "#334155",
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
    color: "#111827",
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
    backgroundColor: "#be123c",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#e2e8f0",
  },
  secondaryButtonText: {
    color: "#1f2937",
    fontWeight: "600",
  },
  dangerButton: {
    backgroundColor: "#fee2e2",
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