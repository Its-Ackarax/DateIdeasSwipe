import { View, ActivityIndicator, Text, StyleSheet, Dimensions } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import Swiper from "react-native-deck-swiper";
import { useFonts, DancingScript_700Bold } from "@expo-google-fonts/dancing-script";
import { LinearGradient } from "expo-linear-gradient";

import DateCard from "../../components/DateCard";
import { useLikes } from "../../store/LikesContext";
import { supabase } from "../../lib/supabase";

import { saveSwipe } from "../../services/saveSwipe";
import { checkMatch } from "../../services/checkMatch";
import { getCoupleId } from "../../services/getCoupleId";
import { DateIdea } from "../../types/date";
import { getDateIdeas } from "../../services/getDateIdeas";

export default function Home() {

  const [fontsLoaded] = useFonts({
    DancingScript_700Bold,
  });

  const { addLike } = useLikes();
  const [dates, setDates] = useState<DateIdea[]>([]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [datesLoading, setDatesLoading] = useState(true);

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
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerHeart}>❤</Text>
            <Text style={styles.title}>Find your next date</Text>
          </View>
          <Text style={styles.subtitle}>
            Swipe right to like, left to pass
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
        <Swiper
          cards={filteredDates}
          renderCard={(card) => <DateCard item={card} />}
          onSwipedRight={(i) => handleSwipe(filteredDates[i], true)}
          onSwipedLeft={(i) => handleSwipe(filteredDates[i], false)}
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
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.2)",
    shadowColor: "#7f1d1d",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    alignItems: "center",
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
    fontSize: 22,
    color: "#7f1d1d",
    letterSpacing: 0.2,
    fontFamily: "DancingScript_700Bold",
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
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