import { Pacifico_400Regular, useFonts } from "@expo-google-fonts/pacifico";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StatusBar as RNStatusBar,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BrandStatusBar from "../../components/BrandStatusBar";
import DateCard from "../../components/DateCard";
import MatchCategorySection from "../../components/MatchCategorySection";
import MatchesEmptyState from "../../components/MatchesEmptyState";
import MatchesScreenHeader from "../../components/MatchesScreenHeader";
import {
  categorySortIndex,
  getCategoryVisual,
} from "../../constants/categoryVisuals";
import { captureAppError } from "../../lib/captureAppError";
import { supabase } from "../../lib/supabase";
import { getDateIdeas } from "../../services/getDateIdeas";
import type { DateIdea } from "../../types/date";

/** Extra top inset above the header on the empty matches screen. */
const EMPTY_CONTENT_TOP_OFFSET = 20;
/** Space between the header card and the stage / CTA block. */
const EMPTY_HEADER_BODY_GAP = 44;
/** Breathing room below the empty-state CTA (tab bar already excludes screen height). */
const EMPTY_PAGE_BOTTOM_GAP = 0;
/** Extra top inset on the unlinked matches screen. */
const NO_PARTNER_CONTENT_TOP_OFFSET = 24;
/** Breathing room below unlinked matches content (tab bar already excludes screen height). */
const NO_PARTNER_CONTENT_BOTTOM_GAP = 12;

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Matches() {
  const [fontsLoaded] = useFonts({ Pacifico_400Regular });
  const [matches, setMatches] = useState<string[]>([]);
  const [hasCouple, setHasCouple] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState<DateIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<DateIdea | null>(null);
  const previewTranslate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set()
  );
  const [howItWorksExpanded, setHowItWorksExpanded] = useState(false);
  const insets = useSafeAreaInsets();
  const topInset =
    Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 0) + 8 : 8;
  useEffect(() => {
    if (selectedIdea) {
      previewTranslate.setValue({ x: 0, y: 0 });
    }
  }, [selectedIdea, previewTranslate]);

  const closePreview = useCallback(() => {
    setSelectedIdea(null);
  }, []);

  const previewPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
        onPanResponderMove: (_, gesture) => {
          previewTranslate.setValue({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_, gesture) => {
          const distance = Math.sqrt(
            Math.pow(gesture.dx, 2) + Math.pow(gesture.dy, 2)
          );

          if (distance > 140) {
            Animated.timing(previewTranslate, {
              toValue: { x: gesture.dx * 2, y: gesture.dy * 2 },
              duration: 180,
              useNativeDriver: true,
            }).start(closePreview);
          } else {
            Animated.spring(previewTranslate, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [closePreview, previewTranslate]
  );

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
      captureAppError(error, { op: "loadMatches", screen: "matches" });
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
      .filter(([, data]) => data.length > 0)
      .sort(([a], [b]) => categorySortIndex(a) - categorySortIndex(b))
      .map(([title, data]) => ({
        title,
        data: data.sort((a, b) => a.title.localeCompare(b.title)),
      }));
  }, [matchedIdeas]);

  const toggleCategory = useCallback((title: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  }, []);

  const toggleHowItWorks = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHowItWorksExpanded((prev) => !prev);
  }, []);

  const allCollapsed = expandedCategories.size === 0;
  const useDistributedList = sections.length >= 5 && allCollapsed;

  const categorySections = sections.map((section) => (
    <MatchCategorySection
      key={section.title}
      title={section.title}
      ideas={section.data}
      visuals={getCategoryVisual(section.title)}
      expanded={expandedCategories.has(section.title)}
      onToggle={() => toggleCategory(section.title)}
      onSelectIdea={setSelectedIdea}
    />
  ));

  const populatedVerticalPadding = {
    paddingTop: topInset,
    paddingBottom: insets.bottom + 24,
  };

  if (hasCouple === false) {
    return (
      <LinearGradient colors={["#fb7185", "#fff1f2"]} style={styles.screen}>
        <BrandStatusBar />
        <View style={styles.topGlow} />
        <View style={styles.bottomGlow} />
        <ScrollView
          contentContainerStyle={[
            styles.noPartnerScroll,
            {
              paddingTop: topInset + NO_PARTNER_CONTENT_TOP_OFFSET,
              paddingBottom: NO_PARTNER_CONTENT_BOTTOM_GAP,
              justifyContent: howItWorksExpanded ? "flex-start" : "center",
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <MatchesScreenHeader />

          <View style={styles.noPartnerCard}>
            <View style={styles.noPartnerIconWrap}>
              <Text style={styles.noPartnerIcon}>💞</Text>
            </View>
            <Text style={styles.noPartnerHeadline}>Link your partner first</Text>
            <Text style={styles.noPartnerBody}>
              Matches only appear after you connect accounts. Then we can show ideas you
              both swiped right on.
            </Text>
          </View>

          <View
            style={[
              styles.noPartnerSteps,
              !howItWorksExpanded && styles.noPartnerStepsCollapsed,
            ]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.noPartnerStepsHeader,
                pressed && styles.noPartnerStepsHeaderPressed,
              ]}
              onPress={toggleHowItWorks}
              accessibilityRole="button"
              accessibilityState={{ expanded: howItWorksExpanded }}
              accessibilityLabel={
                howItWorksExpanded
                  ? "How it works, expanded. Tap to hide steps."
                  : "How it works, collapsed. Tap to view steps."
              }
            >
              <View style={styles.noPartnerStepsHeaderLeft}>
                <Text style={styles.noPartnerStepsTitle}>How it works</Text>
                {!howItWorksExpanded ? (
                  <Text style={styles.noPartnerStepsHint}>Tap to view:</Text>
                ) : null}
              </View>
              <Text
                style={[styles.noPartnerChevron, howItWorksExpanded && styles.noPartnerChevronExpanded]}
              >
                ›
              </Text>
            </Pressable>

            {howItWorksExpanded ? (
              <View style={styles.noPartnerStepsBody}>
                <View style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>1</Text>
                  </View>
                  <Text style={styles.stepText}>
                    Link your partner by following the instructions after pressing the link
                    partner button.
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>2</Text>
                  </View>
                  <Text style={styles.stepText}>
                    Keep swiping on the home tab - likes are saved for both of you.
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>3</Text>
                  </View>
                  <Text style={styles.stepText}>
                    When you both like the same idea, it shows up here as a match.
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.noPartnerCta,
              pressed && styles.noPartnerCtaPressed,
            ]}
            onPress={() => router.push("/profile/link")}
          >
            <Text style={styles.noPartnerCtaText}>Link partner</Text>
          </Pressable>

          <Text style={styles.noPartnerHint}>
            You can still browse and like dates before linking - your likes are saved and count
            toward matches once you link.
          </Text>
        </ScrollView>
      </LinearGradient>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (sections.length === 0) {
    if (!fontsLoaded) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" />
        </View>
      );
    }

    return (
      <LinearGradient
        colors={["#fda4af", "#fff1f2", "#fff1f2"]}
        locations={[0, 0.28, 1]}
        style={styles.screen}
      >
        <BrandStatusBar />
        <View style={styles.topGlow} />
        <View style={styles.bottomGlow} />
        <View
          style={[
            styles.emptyPage,
            {
              paddingTop: topInset + EMPTY_CONTENT_TOP_OFFSET,
              paddingBottom: insets.bottom + EMPTY_PAGE_BOTTOM_GAP,
            },
          ]}
        >
          <MatchesScreenHeader style={styles.emptyHeaderSpacing} />
          <MatchesEmptyState
            contentPaddingHorizontal={PAGE_PADDING}
            style={styles.emptyBody}
            onStartSwiping={() => router.push("/(tabs)")}
          />
        </View>
      </LinearGradient>
    );
  }

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={["#fda4af", "#fff1f2", "#fff1f2"]}
      locations={[0, 0.28, 1]}
      style={styles.screen}
    >
      <BrandStatusBar />
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />
      {useDistributedList ? (
        <View
          style={[
            styles.populatedPage,
            populatedVerticalPadding,
            { paddingHorizontal: PAGE_PADDING },
          ]}
        >
          <MatchesScreenHeader />
          <View style={styles.categoryListFill}>{categorySections}</View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.page, populatedVerticalPadding]}
          showsVerticalScrollIndicator={false}
        >
          <MatchesScreenHeader />
          {categorySections}
        </ScrollView>
      )}
      <Modal
        visible={Boolean(selectedIdea)}
        animationType="fade"
        transparent
        onRequestClose={closePreview}
      >
        <View style={styles.previewBackdrop}>
          <Pressable style={styles.previewBackdropPress} onPress={closePreview} />
          <Animated.View
            style={[
              styles.previewCard,
              { transform: previewTranslate.getTranslateTransform() },
            ]}
            {...previewPanResponder.panHandlers}
          >
            {selectedIdea ? <DateCard item={selectedIdea} /> : null}
          </Animated.View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const PAGE_PADDING = 20;

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
  populatedPage: {
    flex: 1,
  },
  categoryListFill: {
    flex: 1,
    justifyContent: "space-evenly",
    paddingVertical: 8,
  },
  emptyPage: {
    flex: 1,
    paddingHorizontal: PAGE_PADDING,
    gap: EMPTY_HEADER_BODY_GAP,
  },
  emptyBody: {
    flex: 1,
    minHeight: 0,
  },
  emptyHeaderSpacing: {
    marginBottom: 0,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  previewBackdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  previewCard: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  noPartnerScroll: {
    flexGrow: 1,
    paddingHorizontal: PAGE_PADDING,
  },
  noPartnerCard: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.18)",
    alignItems: "center",
    shadowColor: "#7f1d1d",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  noPartnerIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(244, 63, 94, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  noPartnerIcon: {
    fontSize: 34,
  },
  noPartnerHeadline: {
    fontSize: 20,
    fontWeight: "800",
    color: "#7f1d1d",
    textAlign: "center",
    marginBottom: 8,
  },
  noPartnerBody: {
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
    textAlign: "center",
  },
  noPartnerSteps: {
    marginBottom: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  noPartnerStepsCollapsed: {
    paddingVertical: 12,
  },
  noPartnerStepsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  noPartnerStepsHeaderPressed: {
    opacity: 0.85,
  },
  noPartnerStepsHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  noPartnerStepsTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#be123c",
  },
  noPartnerStepsHint: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  noPartnerChevron: {
    fontSize: 20,
    fontWeight: "700",
    color: "#94a3b8",
    transform: [{ rotate: "0deg" }],
  },
  noPartnerChevronExpanded: {
    transform: [{ rotate: "90deg" }],
    color: "#be123c",
  },
  noPartnerStepsBody: {
    marginTop: 14,
    gap: 14,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(244, 63, 94, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#be123c",
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#334155",
    paddingTop: 2,
  },
  noPartnerCta: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(251, 55, 111, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(190, 18, 60, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#7f1d1d",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  noPartnerCtaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  noPartnerCtaText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  noPartnerHint: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748b",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
  },
});