import { View, Text, SectionList, ActivityIndicator } from "react-native";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getDateIdeas } from "../../services/getDateIdeas";
import type { DateIdea } from "../../types/date";

export default function LikesScreen() {
  const [likes, setLikes] = useState<DateIdea[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLikes = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setLoading(false);
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

    if (swipeError) {
      console.log(swipeError);
      setLoading(false);
      return;
    }

    const allLikedDates = dateIdeas.filter(d =>
      swipeData.some(row => String(row.date_id) === String(d.id))
    );

    // 2️⃣ check if user is linked to a couple
    const { data: couple } = await supabase
      .from("couples")
      .select("*")
      .or(`user1.eq.${user.id},user2.eq.${user.id}`)
      .single();

    if (!couple) {
      setLikes(allLikedDates);
      setLoading(false);
      return;
    }

    const partnerId =
      couple.user1 === user.id ? couple.user2 : couple.user1;

    if (!partnerId) {
      setLikes(allLikedDates);
      setLoading(false);
      return;
    }

    // 3️⃣ get matches for this couple
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select("date_id")
      .eq("couple_id", couple.id);

    if (matchError) {
      console.log(matchError);
      setLoading(false);
      return;
    }

    let matchedIds: string[] = [];

    if (matchData && matchData.length > 0) {
      matchedIds = matchData.map(m => String(m.date_id));
    } else {
      const { data: swipeMatches } = await supabase
        .from("swipes")
        .select("date_id, user_id")
        .in("user_id", [user.id, partnerId])
        .eq("liked", true);

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
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadLikes();
    }, [loadLikes])
  );

  const sections = useMemo(() => {
    const grouped = new Map<string, DateIdea[]>();

    likes.forEach((idea) => {
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
  }, [likes]);

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <Text style={{ fontSize: 18, fontWeight: "600", marginTop: 10 }}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <Text style={{ fontSize: 18, marginVertical: 6 }}>
            {item.title}
          </Text>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 50 }}>
            Like some dates to see them here!
          </Text>
        }
      />
    </View>
  );
}