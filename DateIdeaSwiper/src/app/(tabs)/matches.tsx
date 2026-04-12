import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Platform,
    StatusBar as RNStatusBar,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { getDateIdeas } from "../../services/getDateIdeas";
import type { DateIdea } from "../../types/date";

export default function Matches() {
  const [matches, setMatches] = useState<string[]>([]);
  const [hasCouple, setHasCouple] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState<DateIdea[]>([]);
  const indicatorOpacity = useRef<Record<string, Animated.Value>>({}).current;
  const leftIndicatorOpacity = useRef<Record<string, Animated.Value>>({}).current;
  const layoutWidths = useRef<Record<string, number>>({}).current;
  const contentWidths = useRef<Record<string, number>>({}).current;
  const topInset =
    Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 0) + 8 : 8;

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const dateIdeas = await getDateIdeas();
      setDates(dateIdeas);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const user = userData.user;
      if (!user) {
        setHasCouple(false);
        setMatches([]);
        return;
      }

      const { data: couple, error: coupleError } = await supabase
        .from("couples")
        .select("*")
        .or(`user1.eq.${user.id},user2.eq.${user.id}`)
        .single();

      if (coupleError) throw coupleError;

      if (!couple) {
        setHasCouple(false);
        setMatches([]);
        return;
      }
      const partnerId =
        couple.user1 === user.id ? couple.user2 : couple.user1;

      if (!partnerId) {
        setHasCouple(false);
        setMatches([]);
        return;
      }

      setHasCouple(true);

      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("date_id")
        .eq("couple_id", couple.id);

      if (matchError) throw matchError;

      if (matchData && matchData.length > 0) {
        setMatches(matchData.map((x) => String(x.date_id)));
        return;
      }

      const { data: swipeData, error: swipeError } = await supabase
        .from("swipes")
        .select("date_id, user_id")
        .in("user_id", [user.id, partnerId])
        .eq("liked", true);

      if (swipeError) throw swipeError;

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

        const matchedIds = Array.from(likedByDate.entries())
          .filter(([, users]) => users.size >= 2)
          .map(([dateId]) => dateId);

        setMatches(matchedIds);
      } else {
        setMatches([]);
      }
    } catch (error) {
      console.log(error);
      setMatches([]);
      setHasCouple(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [loadMatches])
  );

  const matchedIdeas = useMemo(() => {
    const matchSet = new Set(matches);
    return dates.filter((idea) => matchSet.has(idea.id));
  }, [dates, matches]);

  const sections = useMemo(() => {
    const grouped = new Map<string, DateIdea[]>();

    matchedIdeas.forEach((idea) => {
      const category = idea.category || "Other";
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)?.push(idea);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({
        title,
        data: data.sort((a, b) => a.title.localeCompare(b.title)),
      }));
  }, [matchedIdeas]);

  const updateFadeOpacity = useCallback(
    (sectionKey: string, offsetX: number) => {
      const content = contentWidths[sectionKey];
      const layout = layoutWidths[sectionKey];

      if (!content || !layout) return;

      if (!indicatorOpacity[sectionKey]) {
        indicatorOpacity[sectionKey] = new Animated.Value(1);
      }
      if (!leftIndicatorOpacity[sectionKey]) {
        leftIndicatorOpacity[sectionKey] = new Animated.Value(0);
      }

      const maxScroll = Math.max(0, content - layout);
      if (maxScroll === 0) {
        indicatorOpacity[sectionKey].setValue(0);
        leftIndicatorOpacity[sectionKey].setValue(0);
        return;
      }

      const start = Math.max(0, maxScroll - CARD_WIDTH / 2);
      let opacity = 1;

      if (offsetX > start) {
        const progress = Math.min(
          1,
          (offsetX - start) / (maxScroll - start || 1)
        );
        opacity = 1 - progress;
      }

      indicatorOpacity[sectionKey].setValue(opacity);
      const leftOpacity = Math.min(1, offsetX / (CARD_WIDTH / 3));
      leftIndicatorOpacity[sectionKey].setValue(leftOpacity);
    },
    [contentWidths, indicatorOpacity, layoutWidths, leftIndicatorOpacity]
  );

  const categoryVisuals: Record<
    string,
    { badgeBg: string; badgeText: string; accent: string }
  > = {
    "Cheap & Cheerful": {
      badgeBg: "#ffedd5",
      badgeText: "#9a3412",
      accent: "#f97316",
    },
    "Day In": {
      badgeBg: "#e0f2fe",
      badgeText: "#075985",
      accent: "#38bdf8",
    },
    "Day Out": {
      badgeBg: "#dcfce7",
      badgeText: "#166534",
      accent: "#22c55e",
    },
    "Night In": {
      badgeBg: "#ede9fe",
      badgeText: "#5b21b6",
      accent: "#a78bfa",
    },
    "Night Out": {
      badgeBg: "#e0f2fe",
      badgeText: "#0c4a6e",
      accent: "#0ea5e9",
    },
    Luxury: {
      badgeBg: "#fef3c7",
      badgeText: "#92400e",
      accent: "#f59e0b",
    },
  };

  if (hasCouple === false) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>
          Link accounts with someone to see your matching dates.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <LinearGradient colors={["#fb7185", "#fff1f2"]} style={styles.screen}>
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>Matches</Text>
          </View>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerIcon}>❤</Text>
            <Text style={styles.title}>Shared date ideas</Text>
          </View>
          <Text style={styles.subtitle}>
            Date ideas you and your partner both liked.
          </Text>
        </View>
        {sections.length === 0 ? (
          <Text style={styles.emptyText}>
            No matches yet — like some dates to get started!
          </Text>
        ) : (
          sections.map((section) => {
            const opacityValue =
              indicatorOpacity[section.title] ?? new Animated.Value(1);
            const leftOpacityValue =
              leftIndicatorOpacity[section.title] ?? new Animated.Value(0);
            if (!indicatorOpacity[section.title]) {
              indicatorOpacity[section.title] = opacityValue;
            }
            if (!leftIndicatorOpacity[section.title]) {
              leftIndicatorOpacity[section.title] = leftOpacityValue;
            }

            return (
              <View key={section.title} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <View style={styles.sectionUnderline} />
                </View>
                <View style={styles.sectionCount}>
                  <Text style={styles.sectionCountText}>{section.data.length}</Text>
                </View>
              </View>
              <View style={styles.rowWrap}>
              <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.row}
                  onLayout={(event) => {
                    layoutWidths[section.title] = event.nativeEvent.layout.width;
                    updateFadeOpacity(section.title, 0);
                  }}
                  onContentSizeChange={(width) => {
                    contentWidths[section.title] = width;
                    updateFadeOpacity(section.title, 0);
                  }}
                  onScroll={(event) => {
                    updateFadeOpacity(section.title, event.nativeEvent.contentOffset.x);
                  }}
                  scrollEventThrottle={16}
                >
                  {section.data.map((item) => {
                    const visuals = categoryVisuals[item.category ?? "Other"] ?? {
                      badgeBg: "#f1f5f9",
                      badgeText: "#0f172a",
                      accent: "#cbd5f5",
                    };

                    return (
                      <View key={item.id} style={styles.card}>
                        {item.image ? (
                          <Image source={{ uri: item.image }} style={styles.cardImage} />
                        ) : null}
                        <View style={styles.cardBody}>
                          <View
                            style={[
                              styles.badge,
                              { backgroundColor: visuals.badgeBg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.badgeText,
                                { color: visuals.badgeText },
                              ]}
                            >
                              {item.category ?? "Other"}
                            </Text>
                          </View>
                          <Text style={styles.cardTitle}>{item.title}</Text>
                          {item.description ? (
                            <Text numberOfLines={2} style={styles.cardDescription}>
                              {item.description}
                            </Text>
                          ) : null}
                        </View>
                        <View
                          style={[styles.cardAccent, { backgroundColor: visuals.accent }]}
                        />
                      </View>
                    );
                  })}
                </ScrollView>
                {section.data.length > 2 ? (
                  <>
                    <Animated.View
                      pointerEvents="none"
                      style={[styles.moreOverlay, { opacity: opacityValue }]}
                    >
                      <LinearGradient
                        colors={[
                          "rgba(255, 241, 242, 0)",
                          "rgba(255, 241, 242, 0.9)",
                        ]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.moreFade}
                      />
                      <View style={styles.morePill}>
                        <Text style={styles.moreArrow}>›</Text>
                      </View>
                    </Animated.View>
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.moreOverlayLeft,
                        { opacity: leftOpacityValue },
                      ]}
                    >
                      <LinearGradient
                        colors={[
                          "rgba(255, 241, 242, 0.9)",
                          "rgba(255, 241, 242, 0)",
                        ]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.moreFadeLeft}
                      />
                      <View style={styles.morePillLeft}>
                        <Text style={styles.moreArrow}>‹</Text>
                      </View>
                    </Animated.View>
                  </>
                ) : null}
              </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const GRID_GAP = 14;
const PAGE_PADDING = 20;
const MORE_FADE_WIDTH = 70;
const MORE_FADE_MARGIN = 4;
const CARD_WIDTH = Math.floor(
  (Dimensions.get("window").width - PAGE_PADDING * 2 - GRID_GAP) / 2
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: "#fda4af",
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
  page: {
    padding: PAGE_PADDING,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 22,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.16)",
    shadowColor: "#7f1d1d",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    gap: 6,
  },
  headerBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.18)",
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#be123c",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIcon: {
    fontSize: 18,
    color: "#e11d48",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#7f1d1d",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    color: "#6b7280",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  sectionUnderline: {
    marginTop: 4,
    height: 2,
    width: 32,
    borderRadius: 999,
    backgroundColor: "#a11225",
  },
  sectionCount: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(161, 18, 37, 0.35)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(161, 18, 37, 0.7)",
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f8fafc",
  },
  rowWrap: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
  },
  row: {
    flexDirection: "row",
    gap: GRID_GAP,
    paddingRight: 12,
  },
  moreFade: {
    position: "absolute",
    top: 0,
    right: -6,
    bottom: 0,
    width: 70,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  moreOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  moreOverlayLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  moreFadeLeft: {
    position: "absolute",
    top: 0,
    left: -6,
    bottom: 0,
    width: 70,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  morePillLeft: {
    position: "absolute",
    left: 6,
    top: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  morePill: {
    position: "absolute",
    right: 6,
    top: 12,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  moreArrow: {
    fontSize: 14,
    color: "#94a3b8",
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardImage: {
    width: "100%",
    height: CARD_WIDTH * 1.1,
    backgroundColor: "#f1f5f9",
  },
  cardBody: {
    padding: 12,
    gap: 6,
    flexGrow: 1,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardDescription: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 16,
  },
  cardAccent: {
    height: 4,
    marginTop: "auto",
  },
  emptyState: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#fff1f2",
  },
  emptyTitle: {
    fontSize: 18,
    textAlign: "center",
    color: "#475569",
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#64748b",
  },
});