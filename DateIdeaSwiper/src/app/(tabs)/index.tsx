import { DancingScript_700Bold, useFonts } from "@expo-google-fonts/dancing-script";
import { Pacifico_400Regular } from "@expo-google-fonts/pacifico";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import BrandStatusBar from "../../components/BrandStatusBar";
import SwipeDeck, { type SwipeDeckHandle } from "../../components/SwipeDeck";
import SwipeStageBackground from "../../components/SwipeStageBackground";
import { captureAppError } from "../../lib/captureAppError";
import { REVENUECAT_PAYWALL_ENABLED } from "../../lib/revenuecat";
import { supabase } from "../../lib/supabase";
import { useLikes } from "../../store/LikesContext";
import { usePro } from "../../store/ProContext";

import { checkMatch } from "../../services/checkMatch";
import { getCoupleId } from "../../services/getCoupleId";
import { getDateIdeas } from "../../services/getDateIdeas";
import { saveSwipe } from "../../services/saveSwipe";
import { DateIdea } from "../../types/date";
import { dailySeededOrder } from "../../utils/dailySeededOrder";
import { prefetchDateImages } from "../../utils/prefetchDateImages";

export default function Home() {

  const [fontsLoaded] = useFonts({
    DancingScript_700Bold,
    Pacifico_400Regular,
  });

  const { isPro } = usePro();
  const { addLike } = useLikes();
  const [dates, setDates] = useState<DateIdea[]>([]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [deckDates, setDeckDates] = useState<DateIdea[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const coupleIdRef = useRef<string | null>(null);
  const matchVisibleRef = useRef(false);
  const pendingMatchCountRef = useRef(0);
  const suppressDeckSyncRef = useRef(false);
  const swipeDeckRef = useRef<SwipeDeckHandle>(null);
  const deckDatesRef = useRef(deckDates);
  const handleSwipeRef = useRef<(date: DateIdea, liked: boolean) => Promise<void>>(async () => {});

  deckDatesRef.current = deckDates;
  const [loading, setLoading] = useState(true);
  const [datesLoading, setDatesLoading] = useState(true);
  const [swiperKey, setSwiperKey] = useState(0);
  const [matchVisible, setMatchVisible] = useState(false);
  const [matchIsFollowUp, setMatchIsFollowUp] = useState(false);
  const [matchToastDisabled, setMatchToastDisabled] = useState(false);
  const heartAnimations = useRef(
    [0, 1, 2].map(() => ({
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  const loadMatchPreference = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("matchModalDisabled");
      setMatchToastDisabled(stored === "true");
    } catch (error) {
      captureAppError(error, { op: "asyncStorage_matchModal", screen: "home" });
    }
  }, []);

  useEffect(() => {
    loadMatchPreference();
  }, [loadMatchPreference]);

  useFocusEffect(
    useCallback(() => {
      loadMatchPreference();
    }, [loadMatchPreference])
  );

  useEffect(() => {
    coupleIdRef.current = coupleId;
  }, [coupleId]);

  useEffect(() => {
    matchVisibleRef.current = matchVisible;
  }, [matchVisible]);

  const triggerMatchHearts = useCallback(() => {
    heartAnimations.forEach((anim) => {
      anim.translateY.setValue(0);
      anim.opacity.setValue(0);
    });

    Animated.stagger(
      120,
      heartAnimations.map((anim) =>
        Animated.parallel([
          Animated.timing(anim.translateY, {
            toValue: -120,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 140,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
        ])
      )
    ).start();
  }, [heartAnimations]);

  const notifyMatch = useCallback(() => {
    if (matchToastDisabled) return;
    triggerMatchHearts();
    if (matchVisibleRef.current) {
      pendingMatchCountRef.current += 1;
      return;
    }
    setMatchIsFollowUp(false);
    setMatchVisible(true);
  }, [matchToastDisabled, triggerMatchHearts]);

  const dismissMatchModal = useCallback(() => {
    if (pendingMatchCountRef.current > 0) {
      pendingMatchCountRef.current -= 1;
      setMatchIsFollowUp(true);
      triggerMatchHearts();
      setMatchVisible(true);
      return;
    }
    setMatchVisible(false);
    setMatchIsFollowUp(false);
  }, [triggerMatchHearts]);

  const markDateSeen = useCallback((dateId: string) => {
    setSeenIds((prev) => (prev.includes(dateId) ? prev : [...prev, dateId]));
  }, []);

  const handleSwipe = useCallback(
    async (date: DateIdea, liked: boolean) => {
      if (!date) return;
      suppressDeckSyncRef.current = true;
      const dateId = String(date.id);
      const feedbackDone =
        swipeDeckRef.current?.showFeedback(liked ? "like" : "pass") ?? Promise.resolve();
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user) {
          await feedbackDone;
          markDateSeen(dateId);
          return;
        }

        if (REVENUECAT_PAYWALL_ENABLED && !isPro && seenIds.length >= 10) {
          await feedbackDone;
          markDateSeen(dateId);
          router.push("/paywall");
          return;
        }

        const cachedCoupleId = coupleIdRef.current;
        const savePromise = saveSwipe(user.id, date.id, liked, cachedCoupleId);

        if (liked && cachedCoupleId) {
          addLike(date);
          await savePromise;
          const matched = await checkMatch(cachedCoupleId, date.id);
          if (matched) {
            notifyMatch();
          }
          markDateSeen(dateId);
          await feedbackDone;
          return;
        }

        await feedbackDone;
        await savePromise;
        if (liked) {
          addLike(date);
        }
        markDateSeen(dateId);
      } catch (error) {
        captureAppError(error, { op: "handleSwipe", dateId, liked });
        await feedbackDone;
        markDateSeen(dateId);
      }
    },
    [addLike, isPro, markDateSeen, notifyMatch, seenIds.length]
  );

  handleSwipeRef.current = handleSwipe;

  const onSwipedRight = useCallback((index: number) => {
    const card = deckDatesRef.current[index];
    if (card) void handleSwipeRef.current(card, true);
  }, []);

  const onSwipedLeft = useCallback((index: number) => {
    const card = deckDatesRef.current[index];
    if (card) void handleSwipeRef.current(card, false);
  }, []);
  const loadSeen = useCallback(async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        captureAppError(userError, { op: "loadSeen_getUser", screen: "home" });
        return;
      }
      const user = userData.user;
      if (!user) return;
      setUserId(user.id);

      const resolvedCoupleId = await getCoupleId(user.id);
      setCoupleId(resolvedCoupleId);

      const { data, error } = await supabase
        .from("swipes")
        .select("date_id")
        .eq("user_id", user.id);

      if (error) {
        captureAppError(error, { op: "loadSeen_swipes", screen: "home" });
        return;
      }

      if (data) setSeenIds(data.map(x => String(x.date_id)));
    } catch (error) {
      captureAppError(error, { op: "loadSeen_catch", screen: "home" });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDates = useCallback(async () => {
    try {
      const data = await getDateIdeas();
      setDates(data);
    } catch (error) {
      captureAppError(error, { op: "loadDates", screen: "home" });
    } finally {
      setDatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  useFocusEffect(
    useCallback(() => {
      suppressDeckSyncRef.current = false;
      setLoading(true);
      loadSeen();
    }, [loadSeen])
  );

  const todayKey = new Date().toISOString().slice(0, 10); // UTC day key

  const buildDeck = useCallback(() => {
    const filtered = dates.filter((d) => !seenIds.includes(d.id));
    if (!userId) return filtered;
    return dailySeededOrder(filtered, `${userId}:${todayKey}`);
  }, [dates, seenIds, userId, todayKey]);

  // Rebuild the swiper deck when loading from the server — not after each swipe (swiper advances on its own).
  useEffect(() => {
    if (suppressDeckSyncRef.current) return;
    if (loading || datesLoading || !userId || dates.length === 0) return;
    const nextDeck = buildDeck();
    setDeckDates(nextDeck);
    prefetchDateImages(nextDeck, 5);
  }, [buildDeck, loading, datesLoading, userId, dates.length]);

  if (!fontsLoaded || loading || datesLoading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  if (dates.length === 0) {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator size="small" />
        <View style={{ height: 12 }} />
        <Text style={styles.emptyText}>No date ideas yet.</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={["#fda4af", "#fff1f2", "#fff1f2"]}
      locations={[0, 0.28, 1]}
      style={styles.page}
    >
      <BrandStatusBar />
      <View style={styles.header}>
        <View style={styles.headerCard}>
          <View style={styles.headerLabel}>
            <Text style={styles.headerLabelText}>Today’s picks</Text>
          </View>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerHeart}>❤</Text>
            <Text style={styles.title}>What will be your next date?</Text>
          </View>
          <Text style={styles.subtitle}>
            Fresh ideas tailored for easy, fun planning.
          </Text>
        </View>
      </View>
      <View
        style={styles.swiperWrap}
        pointerEvents={matchVisible ? "none" : "auto"}
      >
        <SwipeStageBackground />
        {deckDates.length > 0 ? (
          <SwipeDeck
            ref={swipeDeckRef}
            deckDates={deckDates}
            swiperKey={swiperKey}
            onSwipedRight={onSwipedRight}
            onSwipedLeft={onSwipedLeft}
          />
        ) : (
          <View style={styles.deckEmpty}>
            <Text style={styles.deckEmptyTitle}>You&apos;re all caught up</Text>
            <Text style={styles.deckEmptyText}>Check back tomorrow for fresh date ideas.</Text>
          </View>
        )}
      </View>
      <View pointerEvents="none" style={styles.matchHeartsWrap}>
        {heartAnimations.map((anim, index) => (
          <Animated.Text
            key={`match-heart-${index}`}
            style={[
              styles.matchHeart,
              styles[`matchHeart${index}` as keyof typeof styles],
              {
                opacity: anim.opacity,
                transform: [{ translateY: anim.translateY }],
              },
            ]}
          >
            ✨
          </Animated.Text>
        ))}
      </View>
      <Modal
        visible={matchVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {}}
      >
        <View style={styles.matchBackdrop}>
          <View style={styles.matchBackdropBlocker} />
          <View style={styles.matchCard}>
            <View style={styles.matchIconWrap}>
              <Text style={styles.matchIcon}>❤</Text>
            </View>
            <Text style={styles.matchTitle}>
              {matchIsFollowUp ? "Another match!" : "It’s a match!"}
            </Text>
            <Text style={styles.matchSubtitle}>
              {matchIsFollowUp
                ? "You both loved another idea. Check your matches to plan them together."
                : "You both loved this idea. Check your matches to plan it together."}
            </Text>
            <View style={styles.matchActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.matchButtonSecondary,
                  pressed && styles.matchButtonPressed,
                ]}
                onPress={() => {
                  setMatchToastDisabled(true);
                  pendingMatchCountRef.current = 0;
                  void AsyncStorage.setItem("matchModalDisabled", "true").catch((err) =>
                    captureAppError(err, { op: "asyncStorage_matchModal_disable", screen: "home" })
                  );
                  setMatchVisible(false);
                  setMatchIsFollowUp(false);
                }}
              >
                <Text style={styles.matchButtonSecondaryText}>
                  Don’t show again
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.matchButton,
                  pressed && styles.matchButtonPressed,
                ]}
                onPress={dismissMatchModal}
              >
                <Text style={styles.matchButtonText}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 0,
  },
  header: {
    alignItems: "center",
    marginTop: 28,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  headerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.18)",
    shadowColor: "#7f1d1d",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    alignItems: "center",
    gap: 6,
  },
  headerLabel: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.16)",
  },
  headerLabelText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#be123c",
    textTransform: "uppercase",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    justifyContent: "center",
  },
  headerHeart: {
    fontSize: 18,
    color: "#e11d48",
  },
  title: {
    fontSize: 20,
    color: "#7f1d1d",
    letterSpacing: 0.3,
    fontFamily: "Pacifico_400Regular",
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    fontWeight: "500",
    letterSpacing: 0.2,
    fontFamily: "System",
  },
  swiperWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginTop: 10,
    position: "relative",
    overflow: "hidden",
  },
  deckEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  deckEmptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#881337",
    textAlign: "center",
    marginBottom: 8,
  },
  deckEmptyText: {
    fontSize: 15,
    color: "#9f1239",
    textAlign: "center",
    lineHeight: 22,
  },
  matchBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  matchBackdropBlocker: {
    ...StyleSheet.absoluteFillObject,
  },
  matchCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.2)",
    shadowColor: "#7f1d1d",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  matchIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244, 63, 94, 0.12)",
    marginBottom: 12,
  },
  matchIcon: {
    fontSize: 26,
    color: "#e11d48",
  },
  matchTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#7f1d1d",
    marginBottom: 6,
  },
  matchSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
  },
  matchActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  matchButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#e11d48",
  },
  matchButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  matchButtonSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#94a3b8",
  },
  matchButtonSecondaryText: {
    color: "#0f172a",
    fontWeight: "600",
  },
  matchButtonPressed: {
    opacity: 0.8,
  },
  matchHeartsWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -130,
    height: 180,
    zIndex: 50,
    elevation: 50,
  },
  matchHeart: {
    position: "absolute",
    fontSize: 30,
    color: "rgba(225, 29, 72, 0.8)",
  },
  matchHeart0: {
    left: "28%",
  },
  matchHeart1: {
    left: "50%",
  },
  matchHeart2: {
    left: "70%",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fdf2f8",
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
  },
});