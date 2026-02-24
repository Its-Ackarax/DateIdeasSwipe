import { View, Text, SectionList, ActivityIndicator } from "react-native";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getDateIdeas } from "../../services/getDateIdeas";
import type { DateIdea } from "../../types/date";

export default function Matches() {
  const [matches, setMatches] = useState<string[]>([]);
  const [hasCouple, setHasCouple] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState<DateIdea[]>([]);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const dateIdeas = await getDateIdeas();
      setDates(dateIdeas);
    } catch (error) {
      console.log(error);
    }
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setHasCouple(false);
      setMatches([]);
      setLoading(false);
      return;
    }

    const { data: couple } = await supabase
      .from("couples")
      .select("*")
      .or(`user1.eq.${user.id},user2.eq.${user.id}`)
      .single();

    if (!couple) {
      setHasCouple(false);
      setMatches([]);
      setLoading(false);
      return;
    }
    const partnerId =
      couple.user1 === user.id ? couple.user2 : couple.user1;

    if (!partnerId) {
      setHasCouple(false);
      setMatches([]);
      setLoading(false);
      return;
    }

    setHasCouple(true);

    const { data } = await supabase
      .from("matches")
      .select("date_id")
      .eq("couple_id", couple.id);

    if (data && data.length > 0) {
      setMatches(data.map((x) => String(x.date_id)));
    } else {
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

        const matchedIds = Array.from(likedByDate.entries())
          .filter(([, users]) => users.size >= 2)
          .map(([dateId]) => dateId);

        setMatches(matchedIds);
      } else {
        setMatches([]);
      }
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [loadMatches])
  );

  if (hasCouple === false) {
    return (
      <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, textAlign: "center", color: "#444" }}>
          Link accounts with someone to see your matching dates.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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
            ❤️ {item.title}
          </Text>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 50 }}>
            No matches yet — like some dates to get started!
          </Text>
        }
      />
    </View>
  );
}