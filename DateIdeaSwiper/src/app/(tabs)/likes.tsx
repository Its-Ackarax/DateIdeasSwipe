import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  SafeAreaView,
  Animated,
  PanResponder,
  Platform,
  StatusBar as RNStatusBar,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getDateIdeas } from "../../services/getDateIdeas";
import type { DateIdea } from "../../types/date";

export default function LikesScreen() {
  const [heroHeight, setHeroHeight] = useState(0);
  const [likes, setLikes] = useState<DateIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<{
    title: string;
    data: DateIdea[];
  } | null>(null);
  const topInset =
    Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 0) + 8 : 8;
  const modalTranslateY = useRef(new Animated.Value(0)).current;
  const categoryOrder = [
    "Cheap & Cheerful",
    "Day In",
    "Day Out",
    "Night In",
    "Night Out",
    "Luxury",
  ];
  const categoryVisuals: Record<
    string,
    { emoji: string; accent: string; badgeBg: string; badgeText: string }
  > = {
    "Cheap & Cheerful": {
      emoji: "💸",
      accent: "#f97316",
      badgeBg: "#ffedd5",
      badgeText: "#9a3412",
    },
    "Day In": {
      emoji: "🏡",
      accent: "#38bdf8",
      badgeBg: "#e0f2fe",
      badgeText: "#075985",
    },
    "Night In": {
      emoji: "🕯️",
      accent: "#a78bfa",
      badgeBg: "#ede9fe",
      badgeText: "#5b21b6",
    },
    "Day Out": {
      emoji: "🌤️",
      accent: "#22c55e",
      badgeBg: "#dcfce7",
      badgeText: "#166534",
    },
    "Night Out": {
      emoji: "🌙",
      accent: "#0ea5e9",
      badgeBg: "#e0f2fe",
      badgeText: "#0c4a6e",
    },
    Luxury: {
      emoji: "✨",
      accent: "#f59e0b",
      badgeBg: "#fef3c7",
      badgeText: "#92400e",
    },
  };
  const hexToRgba = useCallback((hex: string, alpha: number) => {
    const normalized = hex.replace("#", "");
    const value =
      normalized.length === 3
        ? normalized
            .split("")
            .map((c) => c + c)
            .join("")
        : normalized.padStart(6, "0");
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }, []);

  useEffect(() => {
    if (activeFolder) {
      modalTranslateY.setValue(0);
    }
  }, [activeFolder, modalTranslateY]);

  const closeModal = useCallback(() => {
    setActiveFolder(null);
  }, []);

  const modalPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) {
            modalTranslateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 120) {
            Animated.timing(modalTranslateY, {
              toValue: 260,
              duration: 180,
              useNativeDriver: true,
            }).start(closeModal);
          } else {
            Animated.spring(modalTranslateY, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [closeModal, modalTranslateY]
  );

  const loadLikes = useCallback(async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const user = userData.user;
      if (!user) {
        setLikes([]);
        return;
      }

      let dateIdeas: DateIdea[] = [];
      try {
        dateIdeas = await getDateIdeas();
      } catch (error) {
        console.log(error);
      }

      // 1️⃣ get user's likes
      const { data: swipeData, error: swipeError } = await supabase
        .from("swipes")
        .select("date_id")
        .eq("user_id", user.id)
        .eq("liked", true);

      if (swipeError) throw swipeError;

      const allLikedDates = dateIdeas.filter(d =>
        swipeData.some(row => String(row.date_id) === String(d.id))
      );

      // 2️⃣ check if user is linked to a couple
      const { data: couple, error: coupleError } = await supabase
        .from("couples")
        .select("*")
        .or(`user1.eq.${user.id},user2.eq.${user.id}`)
        .single();

      if (coupleError) throw coupleError;

      if (!couple) {
        setLikes(allLikedDates);
        return;
      }

      const partnerId =
        couple.user1 === user.id ? couple.user2 : couple.user1;

      if (!partnerId) {
        setLikes(allLikedDates);
        return;
      }

      // 3️⃣ get matches for this couple
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("date_id")
        .eq("couple_id", couple.id);

      if (matchError) throw matchError;

      let matchedIds: string[] = [];

      if (matchData && matchData.length > 0) {
        matchedIds = matchData.map(m => String(m.date_id));
      } else {
        const { data: swipeMatches, error: swipeMatchError } = await supabase
          .from("swipes")
          .select("date_id, user_id")
          .in("user_id", [user.id, partnerId])
          .eq("liked", true);

        if (swipeMatchError) throw swipeMatchError;

        if (swipeMatches) {
          const likedByDate = new Map<string, Set<string>>();

          swipeMatches.forEach((row) => {
            const dateId = String(row.date_id);
            const userId = String(row.user_id);

            if (!likedByDate.has(dateId)) {
              likedByDate.set(dateId, new Set());
            }

            likedByDate.get(dateId)?.add(userId);
          });

          matchedIds = Array.from(likedByDate.entries())
            .filter(([, users]) => users.size >= 2)
            .map(([dateId]) => dateId);
        }
      }

      // 4️⃣ remove matched ones while linked
      const likedDates = allLikedDates.filter(
        d => !matchedIds.includes(String(d.id))
      );

      setLikes(likedDates);
    } catch (error) {
      console.log(error);
      setLikes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadLikes();
    }, [loadLikes])
  );

  const folders = useMemo(() => {
    const grouped = new Map<string, DateIdea[]>();
    categoryOrder.forEach((category) => grouped.set(category, []));

    likes.forEach((idea) => {
      const category = idea.category || "Other";
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)?.push(idea);
    });

    return Array.from(grouped.entries()).map(([title, data]) => ({
      title,
      data: data.sort((a, b) => a.title.localeCompare(b.title)),
    }));
  }, [likes, categoryOrder]);

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: topInset }]}>
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={["#fda4af", "rgba(253, 164, 175, 0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[
              styles.topGlow,
              { height: heroHeight > 0 ? heroHeight + 19 : undefined },
            ]}
          />
          <View
            style={styles.heroCard}
            onLayout={(event) => setHeroHeight(event.nativeEvent.layout.height)}
          >
            <View style={styles.heroTitleRow}>
              <Text style={styles.heroEmoji}>❤</Text>
              <Text style={styles.heroTitle}>Your likes</Text>
            </View>
            <Text style={styles.heroSubtitle}>
              Date ideas grouped into folders
            </Text>
          </View>
        </View>
      {folders.length === 0 ? (
        <Text style={styles.emptyText}>Like some dates to see them here!</Text>
      ) : (
        folders.map((folder) => {
          const preview = folder.data.slice(0, 3);
          const visuals = categoryVisuals[folder.title] ?? {
            emoji: "📁",
            accent: "#94a3b8",
            badgeBg: "#f1f5f9",
            badgeText: "#0f172a",
          };
          return (
            <Pressable
              key={folder.title}
              style={[styles.folderCard, { borderLeftColor: visuals.accent }]}
              onPress={() => setActiveFolder(folder)}
            >
              <View style={styles.folderHeader}>
                <View style={styles.folderTitleWrap}>
                  <Text style={styles.folderEmoji}>{visuals.emoji}</Text>
                  <Text style={styles.folderTitle}>{folder.title}</Text>
                </View>
                <Text
                  style={[
                    styles.folderCount,
                    {
                      backgroundColor: visuals.badgeBg,
                      color: visuals.badgeText,
                    },
                  ]}
                >
                  {folder.data.length}
                </Text>
              </View>
              {preview.length === 0 ? (
                <Text style={styles.folderEmpty}>No likes yet.</Text>
              ) : (
                preview.map((idea) => (
                  <Text key={idea.id} style={styles.folderItem}>
                    {idea.title}
                  </Text>
                ))
              )}
              {folder.data.length > preview.length ? (
                <View style={styles.folderMoreBadge}>
                  <Text style={styles.folderMore}>...</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })
      )}
      <Modal
        visible={Boolean(activeFolder)}
        animationType="fade"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalBackdropPress}
            onPress={closeModal}
          />
          <Animated.View
            style={[
              styles.modalCard,
              { transform: [{ translateY: modalTranslateY }] },
            ]}
          >
            <View style={styles.modalDragZone} {...modalPanResponder.panHandlers}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader} pointerEvents="box-none">
                <View style={styles.modalTitleWrap}>
                  <Text style={styles.modalTitleEmoji}>
                    {categoryVisuals[activeFolder?.title ?? ""]?.emoji ?? "📁"}
                  </Text>
                  <Text style={styles.modalTitle}>
                    {activeFolder?.title ?? ""}
                  </Text>
                </View>
                <Pressable onPress={closeModal}>
                  <Text style={styles.modalClose}>✕</Text>
                </Pressable>
              </View>
            </View>
            <LinearGradient
              colors={[
                hexToRgba(
                  categoryVisuals[activeFolder?.title ?? ""]?.accent ??
                    "#94a3b8",
                  0
                ),
                hexToRgba(
                  categoryVisuals[activeFolder?.title ?? ""]?.accent ??
                    "#94a3b8",
                  0.45
                ),
                hexToRgba(
                  categoryVisuals[activeFolder?.title ?? ""]?.accent ??
                    "#94a3b8",
                  0.4
                ),
                hexToRgba(
                  categoryVisuals[activeFolder?.title ?? ""]?.accent ??
                    "#94a3b8",
                  0.45
                ),
                hexToRgba(
                  categoryVisuals[activeFolder?.title ?? ""]?.accent ??
                    "#94a3b8",
                  0
                ),
              ]}
              locations={[0, 0.25, 0.5, 0.75, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.modalDivider}
            />
            <View style={styles.modalBody}>
              <FlatList
                data={activeFolder?.data ?? []}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.modalItem,
                      {
                        borderLeftColor:
                          categoryVisuals[activeFolder?.title ?? ""]?.accent ??
                          "#e2e8f0",
                      },
                    ]}
                  >
                    <Text style={styles.modalItemTitle}>{item.title}</Text>
                    {item.description ? (
                      <View style={styles.modalDescRow}>
                        <Text style={styles.modalDescBullet}>•</Text>
                        <Text style={styles.modalItemDesc}>
                          {item.description}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.modalEmpty}>No likes yet.</Text>
                }
                contentContainerStyle={
                  (activeFolder?.data?.length ?? 0) === 0
                    ? styles.modalEmptyContainer
                    : undefined
                }
                style={styles.modalList}
                showsVerticalScrollIndicator
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff1f2",
  },
  page: {
    padding: 20,
    paddingBottom: 32,
    paddingTop: 0,
  },
  heroWrap: {
    position: "relative",
    marginBottom: 16,
    marginHorizontal: -20,
    paddingTop: 8,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderRadius: 0,
  },
  heroCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.2)",
    shadowColor: "#7f1d1d",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroEmoji: {
    fontSize: 18,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#7f1d1d",
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6b7280",
  },
  folderCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    borderLeftWidth: 5,
    shadowColor: "#7f1d1d",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  folderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  folderTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  folderEmoji: {
    fontSize: 16,
  },
  folderTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  folderCount: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 2,
    textAlign: "center",
    borderRadius: 999,
    overflow: "hidden",
    fontWeight: "600",
  },
  folderItem: {
    fontSize: 15,
    color: "#334155",
    marginTop: 4,
  },
  folderEmpty: {
    fontSize: 14,
    color: "#94a3b8",
  },
  folderMore: {
    fontSize: 14,
    color: "#94a3b8",
    letterSpacing: 2,
    lineHeight: 16,
  },
  folderMoreBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    maxHeight: "70%",
    width: "88%",
    flexShrink: 1,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  modalDragZone: {
    paddingTop: 4,
    paddingBottom: 6,
  },
  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
    marginBottom: 10,
  },
  modalBody: {
    maxHeight: 360,
    flexShrink: 1,
  },
  modalList: {
    maxHeight: 360,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalDivider: {
    height: 2,
    marginBottom: 14,
  },
  modalTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitleEmoji: {
    fontSize: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  modalClose: {
    fontSize: 20,
    fontWeight: "600",
    color: "#e11d48",
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  modalDescRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  modalDescBullet: {
    color: "#cbd5f5",
    marginRight: 6,
  },
  modalItemDesc: {
    fontSize: 13,
    color: "#64748b",
    flexShrink: 1,
  },
  modalEmpty: {
    textAlign: "center",
    color: "#64748b",
  },
  modalEmptyContainer: {
    paddingVertical: 24,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    color: "#6b7280",
  },
});