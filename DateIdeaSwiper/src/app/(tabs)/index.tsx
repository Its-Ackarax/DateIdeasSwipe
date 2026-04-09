import { DancingScript_700Bold, useFonts } from "@expo-google-fonts/dancing-script";
import { Pacifico_400Regular } from "@expo-google-fonts/pacifico";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Swiper from "react-native-deck-swiper";

import DateCard from "../../components/DateCard";
import { supabase } from "../../lib/supabase";
import { useLikes } from "../../store/LikesContext";

import { checkMatch } from "../../services/checkMatch";
import { getCoupleId } from "../../services/getCoupleId";
import { getDateIdeas } from "../../services/getDateIdeas";
import { saveSwipe } from "../../services/saveSwipe";
import { DateIdea } from "../../types/date";

export default function Home() {

  const [fontsLoaded] = useFonts({
    DancingScript_700Bold,
    Pacifico_400Regular,
  });

  const { addLike } = useLikes();
  const [dates, setDates] = useState<DateIdea[]>([]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [datesLoading, setDatesLoading] = useState(true);
  const [swipeFeedback, setSwipeFeedback] = useState<"like" | "pass" | null>(null);
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  // 🔐 auth guard
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (!active) return;
          if (error) {
            console.log(error);
            return;
          }
          if (!data.session) router.replace("../auth/login");
        } catch (error) {
          if (active) console.log(error);
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  

  const triggerSwipeFeedback = useCallback((type: "like" | "pass") => {
    setSwipeFeedback(type);
    feedbackAnim.setValue(0);
    Animated.sequence([
      Animated.timing(feedbackAnim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.delay(220),
      Animated.timing(feedbackAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setSwipeFeedback(null);
    });
  }, [feedbackAnim]);

  async function handleSwipe(date: DateIdea, liked: boolean) {
    if (!date) return;
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    await saveSwipe(user.id, date.id, liked);

    if (liked) {
      addLike(date); // keep local likes page working

      const coupleId = await getCoupleId(user.id);
      if (!coupleId) return;

      const matched = await checkMatch(coupleId, date.id);

      if (matched) {
        alert("It's a match! 🎉");
      }
    }
  }
  const loadSeen = useCallback(async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.log(userError);
        return;
      }
      const user = userData.user;
      if (!user) return;

      const { data, error } = await supabase
        .from("swipes")
        .select("date_id")
        .eq("user_id", user.id);

      if (error) {
        console.log(error);
        return;
      }

      if (data) setSeenIds(data.map(x => String(x.date_id)));
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDates = useCallback(async () => {
    try {
      const data = await getDateIdeas();
      setDates(data);
    } catch (error) {
      console.log(error);
    } finally {
      setDatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadSeen();
    }, [loadSeen])
  );

  const filteredDates = dates.filter(
    d => !seenIds.includes(d.id)
  );

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
      colors={["#fb7185", "#fff1f2", "#fff1f2"]}
      locations={[0, 0.35, 1]}
      style={styles.page}
    >
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
      <View style={styles.swiperWrap}>
        <LinearGradient
          colors={["#ff0033", "rgba(255, 255, 255, 0)", "#00f56a"]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradientHint}
        />
        <Text style={[styles.sideHintText, styles.sideHintTextLeft]}>PASS</Text>
        <Text style={[styles.sideHintText, styles.sideHintTextRight]}>LIKE</Text>
        {swipeFeedback ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.swipeFeedback,
              swipeFeedback === "like"
                ? styles.swipeFeedbackLike
                : styles.swipeFeedbackPass,
              {
                opacity: feedbackAnim,
                transform: [
                  {
                    scale: feedbackAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.92, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text
              style={[
                styles.swipeFeedbackText,
                swipeFeedback === "like"
                  ? styles.swipeFeedbackTextLike
                  : styles.swipeFeedbackTextPass,
              ]}
            >
              {swipeFeedback === "like" ? "✔" : "✕"}
            </Text>
          </Animated.View>
        ) : null}
        <Swiper
          cards={filteredDates}
          renderCard={(card) => <DateCard item={card} />}
          onSwipedRight={(i) => {
            triggerSwipeFeedback("like");
            handleSwipe(filteredDates[i], true);
          }}
          onSwipedLeft={(i) => {
            triggerSwipeFeedback("pass");
            handleSwipe(filteredDates[i], false);
          }}
          stackSize={3}
          backgroundColor="transparent"
          cardVerticalMargin={12}
          cardHorizontalMargin={0}
          cardStyle={styles.cardStyle}
        />
      </View>
    </LinearGradient>
  );
}

const CARD_WIDTH = Math.round(Dimensions.get("window").width * 0.88);

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 0,
  },
  heroBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: "#7f1d1d",
    opacity: 0.2,
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
  },
  cardStyle: {
    width: CARD_WIDTH,
    alignSelf: "center",
    marginLeft: (Dimensions.get("window").width - CARD_WIDTH) / 2,
    marginBottom: 28,
  },
  gradientHint: {
    position: "absolute",
    top: "50%",
    left: 8,
    right: 8,
    height: 320,
    borderRadius: 20,
    opacity: 0.55,
    borderWidth: 1,
    borderColor: "#ffffff",
    zIndex: 0,
    marginTop: -160,
  },
  sideHintText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: 0.8,
    transform: [{ rotate: "-90deg" }],
  },
  sideHintTextLeft: {
    position: "absolute",
    top: "50%",
    left: 18,
    marginTop: -20,
    zIndex: 1,
  },
  sideHintTextRight: {
    position: "absolute",
    top: "50%",
    right: 18,
    marginTop: -20,
    zIndex: 1,
  },
  swipeFeedback: {
    position: "absolute",
    top: 22,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    zIndex: 2,
    borderWidth: 1,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  swipeFeedbackLike: {
    borderColor: "rgba(34, 197, 94, 0.35)",
  },
  swipeFeedbackPass: {
    borderColor: "rgba(239, 68, 68, 0.35)",
  },
  swipeFeedbackText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 1,
  },
  swipeFeedbackTextLike: {
    color: "#16a34a",
  },
  swipeFeedbackTextPass: {
    color: "#dc2626",
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